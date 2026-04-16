import { PrismaClient, Prisma } from '@prisma/client';
import axios from 'axios';

const prisma = new PrismaClient();
const TCGDEX_URL = 'https://api.tcgdex.net/v2/en';


interface TCGdexCard {
  id: string;
  localId: string;
  name: string;
  image?: string;
  category: string;
  hp?: number;
  types?: string[];
  stage?: string;
  abilities?: Array<{ name: string; effect: string; type: string }>;
  attacks?: Array<{ name: string; cost?: string[]; damage?: string | number; effect?: string }>;
  weaknesses?: Array<{ type: string; value?: string }>;
  resistances?: Array<{ type: string; value?: string }>;
  retreat?: number;
  effect?: string;
  trainerType?: string;
  energyType?: string;
  legal?: { standard: boolean; expanded: boolean };
  set: { id: string; name: string };
}

interface TCGdexSetInfo {
  id: string;
  name: string;
  cardCount: { total: number; official: number };
}

function toJsonValue(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  if (value === null || value === undefined) return Prisma.JsonNull;
  return value as Prisma.InputJsonValue;
}

async function upsertCard(card: TCGdexCard, setId: string, setName: string) {
  let supertype = 'Pokémon';
  if (card.category === 'Trainer') supertype = 'Trainer';
  if (card.category === 'Energy') supertype = 'Energy';

  const subtypes: string[] = [];
  if (card.stage) subtypes.push(card.stage);
  if (card.trainerType) subtypes.push(card.trainerType);
  if (card.energyType) subtypes.push(card.energyType);

  const legalities = {
    standard: card.legal?.standard ? 'Legal' : 'Not Legal',
    expanded: card.legal?.expanded ? 'Legal' : 'Not Legal',
    unlimited: 'Legal',
  };

  const attacks = card.attacks?.map((a) => ({
    name: a.name,
    cost: a.cost || [],
    damage: String(a.damage || ''),
    text: a.effect || '',
  })) || [];

  const abilities = card.abilities?.map((a) => ({
    name: a.name,
    text: a.effect,
    type: a.type || 'Ability',
  })) || [];

  const weaknesses = card.weaknesses?.map((w) => ({ type: w.type, value: w.value || '×2' })) || [];
  const resistances = card.resistances?.map((r) => ({ type: r.type, value: r.value || '-30' })) || [];

  const retreatCost: string[] = [];
  if (card.retreat) {
    for (let i = 0; i < card.retreat; i++) retreatCost.push('Colorless');
  }

  const imageBase = card.image || `https://assets.tcgdex.net/en/${setId}/${card.localId}`;
  const imageSmall = `${imageBase}/low.webp`;
  const imageLarge = `${imageBase}/high.webp`;
  const cardId = `${setId}-${card.localId}`;

  const data = {
    name: card.name,
    supertype,
    subtypes,
    hp: card.hp ? String(card.hp) : null,
    types: card.types || [],
    abilities: toJsonValue(abilities),
    attacks: toJsonValue(attacks),
    weaknesses: toJsonValue(weaknesses),
    resistances: toJsonValue(resistances),
    retreatCost,
    rules: card.effect ? [card.effect] : [],
    legalities: toJsonValue(legalities),
    imageSmall,
    imageLarge,
    setId,
    setName,
  };

  await prisma.card.upsert({
    where: { id: cardId },
    update: { ...data, updatedAt: new Date() },
    create: { id: cardId, ...data },
  });
}

async function syncSet(setId: string): Promise<number> {
  let synced = 0;
  const setRes = await axios.get<{
    id: string;
    name: string;
    cards: Array<{ id: string; localId: string; name: string; image?: string }>;
  }>(`${TCGDEX_URL}/sets/${setId}`, { timeout: 60000 });

  const setName = setRes.data.name;
  const cardList = setRes.data.cards;
  console.log(`  Syncing "${setName}" — ${cardList.length} cards`);

  for (const ref of cardList) {
    try {
      const cardRes = await axios.get<TCGdexCard>(
        `${TCGDEX_URL}/cards/${setId}-${ref.localId}`,
        { timeout: 30000 },
      );
      await upsertCard(cardRes.data, setId, setName);
      synced++;
      if (synced % 25 === 0) process.stdout.write(`    ${synced}/${cardList.length}\r`);
      await new Promise((r) => setTimeout(r, 100));
    } catch {
      console.warn(`    Skipped card ${ref.localId}`);
    }
  }
  console.log(`  Done — ${synced}/${cardList.length} cards synced`);
  return synced;
}

async function main() {
  console.log('Fetching available sets from TCGdex...');
  const setsRes = await axios.get<TCGdexSetInfo[]>(`${TCGDEX_URL}/sets`, { timeout: 30000 });
  const allSets = setsRes.data;

  console.log(`Found ${allSets.length} sets to sync:\n`);
  allSets.forEach((s) => console.log(`  - ${s.name} (${s.id})`));
  console.log();

  let total = 0;
  for (const set of allSets) {
    try {
      const count = await syncSet(set.id);
      total += count;
      await new Promise((r) => setTimeout(r, 2000));
    } catch (err) {
      console.error(`Failed to sync set ${set.id}:`, err instanceof Error ? err.message : err);
    }
  }

  console.log(`\nSync complete! Total cards synced: ${total}`);
}

main()
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
