import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import { tavily, TavilyClient } from '@tavily/core';
import { STANDARD_LEGAL_SETS, ROTATION_INFO } from '../config/rotation.config';

export interface CardData {
  id: string;
  name: string;
  supertype: string;
  subtypes: string[];
  types: string[];
  hp: string | null;
  abilities: unknown;
  attacks: unknown;
  rules: string[];
  setName: string;
  legalities: { standard?: string; expanded?: string } | null;
  imageSmall: string | null;
}

interface RawDeckCard {
  cardId: string;
  cardName: string;
  quantity: number;
  reason: string;
}

interface RawDeckData {
  name?: string;
  description?: string;
  strategy?: string;
  cards?: RawDeckCard[];
}

export interface GeneratedDeck {
  name: string;
  format: string;
  description: string;
  strategy: string;
  cards: Array<{
    cardId: string;
    cardName: string;
    quantity: number;
    reason: string;
    owned: boolean;
    ownedQuantity: number;
  }>;
  totalCards: number;
  missingCards: Array<{ name: string; quantity: number }>;
  ownedPercentage: number;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private openai: OpenAI;
  private tavilyClient: TavilyClient | null = null;

  // Meta deck archetypes - can be updated periodically
  private readonly metaDecks = {
    standard: [
      {
        name: 'Charizard ex',
        tier: 'S',
        description: 'Powerful fire deck with high damage output',
        keyCards: ['Charizard ex', 'Arcanine ex', 'Pidgeot ex', 'Rare Candy'],
      },
      {
        name: 'Gardevoir ex',
        tier: 'S',
        description: 'Psychic energy acceleration with consistent damage',
        keyCards: ['Gardevoir ex', 'Kirlia', 'Ralts', 'Foggy Peak'],
      },
      {
        name: 'Roaring Moon ex',
        tier: 'A',
        description: 'Aggressive dark deck with Ancient synergies',
        keyCards: ['Roaring Moon ex', 'Ancient Booster Energy Capsule'],
      },
      {
        name: 'Lugia VSTAR',
        tier: 'A',
        description: 'Colorless powerhouse with Archeops engine',
        keyCards: ['Lugia VSTAR', 'Lugia V', 'Archeops'],
      },
      {
        name: 'Miraidon ex',
        tier: 'A',
        description: 'Fast electric deck with energy acceleration',
        keyCards: ['Miraidon ex', 'Raikou V', 'Electric Generator'],
      },
    ],
  };

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY not configured');
    }
    this.openai = new OpenAI({ apiKey });

    const tavilyApiKey = this.configService.get<string>('TAVILY_API_KEY');
    if (tavilyApiKey) {
      this.tavilyClient = tavily({ apiKey: tavilyApiKey });
    } else {
      this.logger.warn('TAVILY_API_KEY not configured — web search disabled');
    }
  }

  private async searchWebForMeta(query: string): Promise<string | null> {
    if (!this.tavilyClient) return null;

    try {
      const response = await this.tavilyClient.search(query, {
        searchDepth: 'basic',
        maxResults: 5,
        includeDomains: [
          'reddit.com',
          'limitless.io',
          'pokebeach.com',
          'sixprizes.com',
          'pokemon.com',
        ],
      });

      if (!response.results.length) return null;

      return response.results
        .map((r) => `[${r.title}]\n${r.content}`)
        .join('\n\n');
    } catch (error) {
      this.logger.warn(`Tavily search failed: ${error}`);
      return null;
    }
  }

  private cardToText(card: CardData): string {
    const parts = [
      `${card.name} is a ${card.supertype}`,
      card.subtypes?.length ? `(${card.subtypes.join(', ')})` : '',
      card.types?.length ? `of type ${card.types.join('/')}` : '',
      card.hp ? `with ${card.hp} HP` : '',
      `from set ${card.setName}`,
    ];

    if (card.abilities && Array.isArray(card.abilities)) {
      for (const ability of card.abilities) {
        const a = ability as { name: string; text: string };
        parts.push(`Ability "${a.name}": ${a.text}`);
      }
    }

    if (card.attacks && Array.isArray(card.attacks)) {
      for (const attack of card.attacks) {
        const atk = attack as {
          name: string;
          damage: string;
          text: string;
          cost?: string[];
        };
        const cost = atk.cost ? `[${atk.cost.join(', ')}] ` : '';
        parts.push(
          `Attack ${cost}"${atk.name}" does ${atk.damage || 'no'} damage. ${atk.text || ''}`,
        );
      }
    }

    if (card.rules?.length) {
      parts.push(`Rules: ${card.rules.join(' ')}`);
    }

    return parts.filter(Boolean).join('. ');
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: text,
    });
    return response.data[0].embedding;
  }

  async embedAllCards(): Promise<{ embedded: number; failed: number }> {
    const cards = await this.prisma.card.findMany();
    let embedded = 0;
    let failed = 0;

    for (const card of cards) {
      const text = this.cardToText(card as CardData);
      this.logger.log(`Embedding: ${card.name}`);

      try {
        const embedding = await this.generateEmbedding(text);
        const embeddingStr = JSON.stringify(embedding);

        await this.prisma.$executeRawUnsafe(
          'UPDATE "Card" SET embedding = $1::vector WHERE id = $2',
          embeddingStr,
          card.id,
        );
        embedded++;

        // Rate limit: wait 100ms between calls
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        this.logger.error(`Failed to embed ${card.name}: ${error}`);
        failed++;
      }
    }

    return { embedded, failed };
  }

  async searchCardsByQuery(
    query: string,
    limit = 20,
    format?: string,
  ): Promise<CardData[]> {
    // First try semantic search if embeddings exist
    try {
      const queryEmbedding = await this.generateEmbedding(query);
      const embeddingStr = JSON.stringify(queryEmbedding);

      let results: CardData[];

      if (format === 'standard') {
        results = await this.prisma.$queryRawUnsafe<CardData[]>(
          `SELECT id, name, supertype, subtypes, types, hp, abilities, attacks, rules, "setName", legalities, "imageSmall"
           FROM "Card"
           WHERE embedding IS NOT NULL
             AND legalities->>'standard' = 'Legal'
           ORDER BY embedding <=> $1::vector
           LIMIT $2`,
          embeddingStr,
          limit,
        );
      } else {
        results = await this.prisma.$queryRawUnsafe<CardData[]>(
          `SELECT id, name, supertype, subtypes, types, hp, abilities, attacks, rules, "setName", legalities, "imageSmall"
           FROM "Card"
           WHERE embedding IS NOT NULL
           ORDER BY embedding <=> $1::vector
           LIMIT $2`,
          embeddingStr,
          limit,
        );
      }

      if (results.length > 0) {
        return results;
      }
    } catch (error) {
      this.logger.warn(
        `Semantic search failed, falling back to text search: ${error}`,
      );
    }

    // Fallback to text search
    const where: {
      name: { contains: string; mode: 'insensitive' };
      legalities?: { path: string[]; equals: string };
    } = {
      name: { contains: query, mode: 'insensitive' },
    };
    if (format === 'standard') {
      where.legalities = { path: ['standard'], equals: 'Legal' };
    }

    return this.prisma.card.findMany({
      where,
      take: limit,
    }) as Promise<CardData[]>;
  }

  async getUserCollection(
    userId: string,
  ): Promise<Map<string, { card: CardData; quantity: number }>> {
    const collections = await this.prisma.collection.findMany({
      where: { userId },
      include: {
        cards: {
          include: { card: true },
        },
      },
    });

    const cardMap = new Map<string, { card: CardData; quantity: number }>();

    for (const collection of collections) {
      for (const item of collection.cards) {
        const existing = cardMap.get(item.cardId);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          cardMap.set(item.cardId, {
            card: item.card as CardData,
            quantity: item.quantity,
          });
        }
      }
    }

    return cardMap;
  }

  async chat(
    userId: string,
    message: string,
    conversationHistory: ChatMessage[] = [],
  ): Promise<{ response: string; suggestions?: string[]; sources?: string[] }> {
    const collection = await this.getUserCollection(userId);
    const collectionSummary = this.summarizeCollection(collection);

    const systemPrompt = `You are an expert Pokemon TCG deck building advisor. You help players:
- Build competitive decks
- Understand the current meta and tournament results
- Optimize their existing decks
- Make the most of their card collection
- Answer questions about card rulings, legality, and formats

Current Standard legal sets (${ROTATION_INFO.currentSeason} season):
${STANDARD_LEGAL_SETS.join(', ')}

IMPORTANT: ${ROTATION_INFO.nextRotationNote}. When recommending decks, flag any cards from rotating sets.

Fallback meta decks (Tier S = best, A = great):
${JSON.stringify(this.metaDecks.standard, null, 2)}

User's collection (every card they own):
${collectionSummary}

COLLECTION RULES — follow these strictly:
- When the user asks what cards they have, what they're missing, what decks they can build, or anything about their collection, use ONLY the collection data above to answer. Do not search the web for this.
- When asked "what am I missing for X deck": first use search_web to find the standard deck list for X, then compare every card in that list against the user's collection above, and clearly state which cards they already have and which they are missing.
- Never say the user has a card unless it appears in their collection above.

You have access to a search_web tool. Use it when the question involves:
- Current meta, tier lists, or tournament results
- Recent or upcoming sets and cards
- Card legality, rotation, or ban lists
- Finding a deck list to compare against the user's collection

Be helpful, specific, and concise. When suggesting decks, mention specific card names.
If the user asks about building a deck, ask clarifying questions if needed (format, playstyle, budget).`;

    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: 'function',
        function: {
          name: 'search_web',
          description:
            'Search the web for up-to-date TCG information including tournament results, meta decks, card legality, new sets, and rulings.',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'The search query to look up',
              },
            },
            required: ['query'],
          },
        },
      },
    ];

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: message },
    ];

    // First call — let GPT decide if it needs to search
    const firstResponse = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools,
      tool_choice: 'auto',
      max_tokens: 1000,
    });

    const firstChoice = firstResponse.choices[0];

    // If GPT called search_web, execute it and call again with results
    if (firstChoice.finish_reason === 'tool_calls' && firstChoice.message.tool_calls) {
      const toolCall = firstChoice.message.tool_calls[0];
      const args = (toolCall as unknown as { function: { arguments: string } }).function.arguments;
      const { query } = JSON.parse(args) as { query: string };

      this.logger.log(`AI searching web for: ${query}`);
      const webResults = await this.searchWebForMeta(query);

      const messagesWithResults: OpenAI.ChatCompletionMessageParam[] = [
        ...messages,
        firstChoice.message,
        {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: webResults || 'No results found.',
        },
      ];

      const secondResponse = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: messagesWithResults,
        max_tokens: 1000,
      });

      const response =
        secondResponse.choices[0].message.content ||
        'I could not generate a response.';

      return { response, suggestions: this.generateSuggestions(message), sources: ['web', 'collection'] };
    }

    const response =
      firstChoice.message.content || 'I could not generate a response.';

    return { response, suggestions: this.generateSuggestions(message), sources: ['collection'] };
  }

  async buildDeck(
    userId: string,
    archetype: string,
    format: string = 'standard',
  ): Promise<GeneratedDeck> {
    // Search for cards related to the archetype
    const relevantCards = await this.searchCardsByQuery(archetype, 50, format);

    // Get user's collection
    const userCollection = await this.getUserCollection(userId);

    // Get trainer and energy cards
    const trainerCards = await this.prisma.card.findMany({
      where: {
        supertype: 'Trainer',
        ...(format === 'standard'
          ? { legalities: { path: ['standard'], equals: 'Legal' } }
          : {}),
      },
      take: 30,
    });

    const energyCards = await this.prisma.card.findMany({
      where: {
        supertype: 'Energy',
        ...(format === 'standard'
          ? { legalities: { path: ['standard'], equals: 'Legal' } }
          : {}),
      },
      take: 20,
    });

    // Build context for GPT
    const pokemonContext = relevantCards
      .filter((c) => c.supertype === 'Pokémon')
      .slice(0, 20)
      .map(
        (c) => `- ${c.name} (${c.id}): ${this.cardToText(c).substring(0, 200)}`,
      )
      .join('\n');

    const trainerContext = trainerCards
      .slice(0, 15)
      .map((c) => `- ${c.name} (${c.id})`)
      .join('\n');

    const energyContext = energyCards
      .slice(0, 10)
      .map((c) => `- ${c.name} (${c.id})`)
      .join('\n');

    const userOwnedCards = Array.from(userCollection.entries())
      .map(([, data]) => `${data.card.name} x${data.quantity}`)
      .join(', ');

    const prompt = `Build a competitive 60-card ${format} format Pokemon TCG deck focused on "${archetype}".

Available Pokemon cards:
${pokemonContext}

Available Trainer cards:
${trainerContext}

Available Energy cards:
${energyContext}

User owns these cards: ${userOwnedCards || 'No cards in collection'}

Return a JSON object with this exact structure:
{
  "name": "Deck Name",
  "description": "Brief deck description",
  "strategy": "How to play this deck",
  "cards": [
    {"cardId": "card-id-here", "cardName": "Card Name", "quantity": 4, "reason": "Why this card"}
  ]
}

Rules:
- Exactly 60 cards total
- Max 4 copies of any card (except basic energy)
- Include Pokemon, Trainers, and Energy
- Focus on the ${archetype} strategy
- Use ONLY the card IDs provided above`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content:
            'You are an expert Pokemon TCG deck builder. Return only valid JSON, no markdown.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    });

    const responseText = completion.choices[0].message.content || '{}';
    let deckData: RawDeckData;

    try {
      deckData = JSON.parse(responseText) as RawDeckData;
    } catch {
      this.logger.error('Failed to parse deck JSON:', responseText);
      throw new Error('Failed to generate deck');
    }

    // Calculate ownership stats
    const cardsWithOwnership = (deckData.cards || []).map((card) => {
      const owned = userCollection.get(card.cardId);
      return {
        ...card,
        owned: !!owned,
        ownedQuantity: owned?.quantity || 0,
      };
    });

    const totalCards = cardsWithOwnership.reduce(
      (sum, c) => sum + c.quantity,
      0,
    );
    const ownedCards = cardsWithOwnership.reduce(
      (sum, c) => sum + Math.min(c.quantity, c.ownedQuantity),
      0,
    );

    const missingCards = cardsWithOwnership
      .filter((c) => c.ownedQuantity < c.quantity)
      .map((c) => ({
        name: c.cardName,
        quantity: c.quantity - c.ownedQuantity,
      }));

    return {
      name: deckData.name || `${archetype} Deck`,
      format,
      description: deckData.description || '',
      strategy: deckData.strategy || '',
      cards: cardsWithOwnership,
      totalCards,
      missingCards,
      ownedPercentage:
        totalCards > 0 ? Math.round((ownedCards / totalCards) * 100) : 0,
    };
  }

  async analyzeCollection(userId: string): Promise<{
    summary: string;
    possibleDecks: Array<{
      archetype: string;
      completeness: number;
      missingKeyCards: string[];
    }>;
    recommendations: string[];
  }> {
    const collection = await this.getUserCollection(userId);

    if (collection.size === 0) {
      return {
        summary: 'Your collection is empty. Start by adding some cards!',
        possibleDecks: [],
        recommendations: [
          'Add cards to your collection to get deck suggestions',
        ],
      };
    }

    const collectionCards = Array.from(collection.values());
    const collectionText = collectionCards
      .map(
        (c) =>
          `${c.card.name} x${c.quantity} (${c.card.supertype}, ${c.card.types?.join('/') || 'Colorless'})`,
      )
      .join('\n');

    const prompt = `Analyze this Pokemon TCG collection and suggest what decks could be built:

Collection:
${collectionText}

Current meta decks to consider:
${JSON.stringify(this.metaDecks.standard, null, 2)}

Return a JSON object:
{
  "summary": "Overall collection analysis",
  "possibleDecks": [
    {
      "archetype": "Deck archetype name",
      "completeness": 75,
      "missingKeyCards": ["Card 1", "Card 2"]
    }
  ],
  "recommendations": ["Suggestion 1", "Suggestion 2"]
}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a Pokemon TCG collection analyst. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    try {
      return JSON.parse(completion.choices[0].message.content || '{}') as {
        summary: string;
        possibleDecks: Array<{
          archetype: string;
          completeness: number;
          missingKeyCards: string[];
        }>;
        recommendations: string[];
      };
    } catch {
      return {
        summary: 'Could not analyze collection',
        possibleDecks: [],
        recommendations: [],
      };
    }
  }

  async improveDeck(
    userId: string,
    deckId: string,
  ): Promise<{
    suggestions: Array<{ remove: string; add: string; reason: string }>;
    overallAdvice: string;
  }> {
    // Get the deck
    const deck = await this.prisma.deck.findFirst({
      where: { id: deckId, userId },
      include: {
        cards: {
          include: { card: true },
        },
      },
    });

    if (!deck) {
      throw new Error('Deck not found');
    }

    // Get user's collection for alternatives
    const collection = await this.getUserCollection(userId);

    const deckList = deck.cards
      .map((dc) => `${dc.quantity}x ${dc.card.name} (${dc.card.supertype})`)
      .join('\n');

    const collectionList = Array.from(collection.values())
      .filter((c) => !deck.cards.some((dc) => dc.cardId === c.card.id))
      .map((c) => `${c.card.name} (${c.card.supertype})`)
      .join(', ');

    const prompt = `Analyze this Pokemon TCG deck and suggest improvements:

Deck: ${deck.name} (${deck.format} format)
${deckList}

Cards the user owns but aren't in the deck:
${collectionList || 'None'}

Return a JSON object:
{
  "suggestions": [
    {"remove": "Card to remove", "add": "Card to add", "reason": "Why this swap helps"}
  ],
  "overallAdvice": "General advice for the deck"
}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a Pokemon TCG deck optimizer. Return only valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      max_tokens: 1000,
      response_format: { type: 'json_object' },
    });

    try {
      return JSON.parse(completion.choices[0].message.content || '{}') as {
        suggestions: Array<{ remove: string; add: string; reason: string }>;
        overallAdvice: string;
      };
    } catch {
      return {
        suggestions: [],
        overallAdvice: 'Could not analyze deck',
      };
    }
  }

  async getMetaInfo(format: string = 'standard'): Promise<{
    topDecks: typeof this.metaDecks.standard;
    explanation: string;
  }> {
    const fallbackDecks =
      this.metaDecks[format as keyof typeof this.metaDecks] ||
      this.metaDecks.standard;

    // Try to get real-time meta data from the web
    const webData = await this.searchWebForMeta(
      `Pokemon TCG ${format} format meta decks tier list ${new Date().getFullYear()}`,
    );

    const userContent = webData
      ? `Using the following real-time data from Pokemon TCG community sources, explain the current ${format} meta and identify the top decks:\n\n${webData}`
      : `Explain the current ${format} meta briefly. Top decks (fallback data): ${fallbackDecks.map((d) => d.name).join(', ')}`;

    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content:
            'You are a Pokemon TCG meta analyst. Provide brief, helpful explanations based on the latest competitive data.',
        },
        { role: 'user', content: userContent },
      ],
      max_tokens: 600,
    });

    return {
      topDecks: fallbackDecks,
      explanation: completion.choices[0].message.content || '',
    };
  }

  private summarizeCollection(
    collection: Map<string, { card: CardData; quantity: number }>,
  ): string {
    if (collection.size === 0) return 'Empty collection';

    const byType: Record<string, number> = {};
    const bySupertype: Record<string, number> = {};
    let totalCards = 0;
    const cardLines: string[] = [];

    for (const [, data] of collection) {
      totalCards += data.quantity;

      const supertype = data.card.supertype || 'Unknown';
      bySupertype[supertype] = (bySupertype[supertype] || 0) + data.quantity;

      for (const type of data.card.types || []) {
        byType[type] = (byType[type] || 0) + data.quantity;
      }

      cardLines.push(
        `${data.card.name} x${data.quantity} (${supertype}, ${data.card.setName})`,
      );
    }

    const summary =
      `${totalCards} total cards (${collection.size} unique). ` +
      `Breakdown: ${Object.entries(bySupertype).map(([k, v]) => `${k}: ${v}`).join(', ')}. ` +
      `Types: ${Object.entries(byType).map(([k, v]) => `${k}: ${v}`).join(', ')}.`;

    return `${summary}\n\nFull card list:\n${cardLines.join('\n')}`;
  }

  private generateSuggestions(userMessage: string): string[] {
    const suggestions: string[] = [];
    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('deck') || lowerMessage.includes('build')) {
      suggestions.push('What cards am I missing for this deck?');
      suggestions.push('Show me budget alternatives');
    }

    if (lowerMessage.includes('meta') || lowerMessage.includes('competitive')) {
      suggestions.push('Build me the top meta deck');
      suggestions.push('What counters this strategy?');
    }

    if (lowerMessage.includes('collection')) {
      suggestions.push('What decks can I build?');
      suggestions.push('What should I trade for?');
    }

    if (suggestions.length === 0) {
      suggestions.push('Build me a competitive deck');
      suggestions.push("What's the current meta?");
      suggestions.push('Analyze my collection');
    }

    return suggestions.slice(0, 3);
  }
}
