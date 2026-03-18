// Standard Legal Sets - Update this list when rotation happens
// Last updated: February 2025

export const STANDARD_LEGAL_SETS: string[] = [
  // Scarlet & Violet Era
  'Scarlet & Violet',
  'Paldea Evolved',
  'Obsidian Flames',
  '151',
  'Paradox Rift',
  'Paldean Fates',
  'Temporal Forces',
  'Twilight Masquerade',
  'Shrouded Fable',
  'Stellar Crown',
  'Surging Sparks',
  'Prismatic Evolutions',
  // Promos
  'Scarlet & Violet Promos',
  'SVP Black Star Promos',
];

export const ROTATION_INFO = {
  currentSeason: '2025',
  lastRotationDate: '2024-04-05',
  nextRotationExpected: 'April 2025',
  source: 'https://www.pokemon.com/us/pokemon-tcg-banned-pokemon-cards',
};

// Banned cards (even if from legal sets)
export const BANNED_CARDS_STANDARD: string[] = [];

export function isSetStandardLegal(setName: string): boolean {
  return STANDARD_LEGAL_SETS.some(
    (legalSet) =>
      setName.toLowerCase().includes(legalSet.toLowerCase()) ||
      legalSet.toLowerCase().includes(setName.toLowerCase()),
  );
}

export function isCardBanned(cardId: string): boolean {
  return BANNED_CARDS_STANDARD.includes(cardId);
}
