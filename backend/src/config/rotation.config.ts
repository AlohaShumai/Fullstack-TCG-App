// Standard Legal Sets - Update this list when rotation happens
// Last updated: March 2026
// Note: G-marked sets rotate out April 10, 2026 (in-person) / March 26, 2026 (digital)

// G regulation mark sets (rotating out April 10, 2026)
export const ROTATING_OUT_SETS: string[] = [
  'Scarlet & Violet',
  'Paldea Evolved',
  'Obsidian Flames',
  '151',
  'Paradox Rift',
  'Paldean Fates',
];

export const STANDARD_LEGAL_SETS: string[] = [
  // G regulation mark (rotating out April 10, 2026 — still legal until then)
  ...ROTATING_OUT_SETS,
  // H regulation mark
  'Temporal Forces',
  'Twilight Masquerade',
  'Shrouded Fable',
  // I regulation mark
  'Stellar Crown',
  'Surging Sparks',
  'Prismatic Evolutions',
  // J regulation mark
  'Destined Rivals',
  // Promos
  'Scarlet & Violet Promos',
  'SVP Black Star Promos',
];

export const ROTATION_INFO = {
  currentSeason: '2025-2026',
  lastRotationDate: '2025-04-11',
  nextRotationDate: '2026-04-10',
  nextRotationNote: 'G-marked sets (Scarlet & Violet through Paldean Fates) rotate out April 10, 2026',
  source: 'https://www.pokemon.com/us/pokemon-news/2026-pokemon-tcg-standard-format-rotation-announcement',
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
