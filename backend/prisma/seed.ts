import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

const sampleCards = [
  {
    id: 'base1-4',
    name: 'Charizard',
    supertype: 'Pokémon',
    subtypes: ['Stage 2'],
    hp: '120',
    types: ['Fire'],
    abilities: Prisma.JsonNull,
    attacks: [
      {
        name: 'Fire Spin',
        cost: ['Fire', 'Fire', 'Fire', 'Fire'],
        damage: '100',
        text: 'Discard 2 Energy cards attached to Charizard in order to use this attack.',
      },
    ],
    weaknesses: [{ type: 'Water', value: '×2' }],
    resistances: [{ type: 'Fighting', value: '-30' }],
    retreatCost: ['Colorless', 'Colorless', 'Colorless'],
    rules: [],
    imageSmall: 'https://images.pokemontcg.io/base1/4.png',
    imageLarge: 'https://images.pokemontcg.io/base1/4_hires.png',
    setId: 'base1',
    setName: 'Base',
  },
  {
    id: 'base1-2',
    name: 'Blastoise',
    supertype: 'Pokémon',
    subtypes: ['Stage 2'],
    hp: '100',
    types: ['Water'],
    abilities: [
      {
        name: 'Rain Dance',
        text: 'As often as you like during your turn, you may attach 1 Water Energy card to 1 of your Water Pokémon.',
        type: 'Pokémon Power',
      },
    ],
    attacks: [
      {
        name: 'Hydro Pump',
        cost: ['Water', 'Water', 'Water'],
        damage: '40+',
        text: 'Does 40 damage plus 10 more damage for each Water Energy attached to Blastoise but not used to pay for this attack.',
      },
    ],
    weaknesses: [{ type: 'Lightning', value: '×2' }],
    resistances: Prisma.JsonNull,
    retreatCost: ['Colorless', 'Colorless', 'Colorless'],
    rules: [],
    imageSmall: 'https://images.pokemontcg.io/base1/2.png',
    imageLarge: 'https://images.pokemontcg.io/base1/2_hires.png',
    setId: 'base1',
    setName: 'Base',
  },
  {
    id: 'base1-15',
    name: 'Venusaur',
    supertype: 'Pokémon',
    subtypes: ['Stage 2'],
    hp: '100',
    types: ['Grass'],
    abilities: [
      {
        name: 'Energy Trans',
        text: 'As often as you like during your turn, you may take 1 Grass Energy card attached to 1 of your Pokémon and attach it to a different one.',
        type: 'Pokémon Power',
      },
    ],
    attacks: [
      {
        name: 'Solarbeam',
        cost: ['Grass', 'Grass', 'Grass', 'Grass'],
        damage: '60',
        text: '',
      },
    ],
    weaknesses: [{ type: 'Fire', value: '×2' }],
    resistances: Prisma.JsonNull,
    retreatCost: ['Colorless', 'Colorless'],
    rules: [],
    imageSmall: 'https://images.pokemontcg.io/base1/15.png',
    imageLarge: 'https://images.pokemontcg.io/base1/15_hires.png',
    setId: 'base1',
    setName: 'Base',
  },
  {
    id: 'base1-44',
    name: 'Bulbasaur',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    hp: '40',
    types: ['Grass'],
    abilities: Prisma.JsonNull,
    attacks: [
      {
        name: 'Leech Seed',
        cost: ['Grass', 'Grass'],
        damage: '20',
        text: 'Unless all damage from this attack is prevented, you may remove 1 damage counter from Bulbasaur.',
      },
    ],
    weaknesses: [{ type: 'Fire', value: '×2' }],
    resistances: Prisma.JsonNull,
    retreatCost: ['Colorless'],
    rules: [],
    imageSmall: 'https://images.pokemontcg.io/base1/44.png',
    imageLarge: 'https://images.pokemontcg.io/base1/44_hires.png',
    setId: 'base1',
    setName: 'Base',
  },
  {
    id: 'base1-46',
    name: 'Charmander',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    hp: '50',
    types: ['Fire'],
    abilities: Prisma.JsonNull,
    attacks: [
      { name: 'Scratch', cost: ['Colorless'], damage: '10', text: '' },
      {
        name: 'Ember',
        cost: ['Fire', 'Colorless'],
        damage: '30',
        text: 'Discard 1 Fire Energy card attached to Charmander in order to use this attack.',
      },
    ],
    weaknesses: [{ type: 'Water', value: '×2' }],
    resistances: Prisma.JsonNull,
    retreatCost: ['Colorless'],
    rules: [],
    imageSmall: 'https://images.pokemontcg.io/base1/46.png',
    imageLarge: 'https://images.pokemontcg.io/base1/46_hires.png',
    setId: 'base1',
    setName: 'Base',
  },
  {
    id: 'base1-63',
    name: 'Squirtle',
    supertype: 'Pokémon',
    subtypes: ['Basic'],
    hp: '40',
    types: ['Water'],
    abilities: Prisma.JsonNull,
    attacks: [
      {
        name: 'Bubble',
        cost: ['Water'],
        damage: '10',
        text: 'Flip a coin. If heads, the Defending Pokémon is now Paralyzed.',
      },
      {
        name: 'Withdraw',
        cost: ['Water', 'Colorless'],
        damage: '',
        text: "Flip a coin. If heads, prevent all damage done to Squirtle during your opponent's next turn.",
      },
    ],
    weaknesses: [{ type: 'Lightning', value: '×2' }],
    resistances: Prisma.JsonNull,
    retreatCost: ['Colorless'],
    rules: [],
    imageSmall: 'https://images.pokemontcg.io/base1/63.png',
    imageLarge: 'https://images.pokemontcg.io/base1/63_hires.png',
    setId: 'base1',
    setName: 'Base',
  },
  {
    id: 'base1-93',
    name: 'Gust of Wind',
    supertype: 'Trainer',
    subtypes: ['Item'],
    hp: null,
    types: [],
    abilities: Prisma.JsonNull,
    attacks: Prisma.JsonNull,
    weaknesses: Prisma.JsonNull,
    resistances: Prisma.JsonNull,
    retreatCost: [],
    rules: [
      "Choose 1 of your opponent's Benched Pokémon and switch it with the Defending Pokémon.",
    ],
    imageSmall: 'https://images.pokemontcg.io/base1/93.png',
    imageLarge: 'https://images.pokemontcg.io/base1/93_hires.png',
    setId: 'base1',
    setName: 'Base',
  },
  {
    id: 'base1-97',
    name: 'Fire Energy',
    supertype: 'Energy',
    subtypes: ['Basic'],
    hp: null,
    types: ['Fire'],
    abilities: Prisma.JsonNull,
    attacks: Prisma.JsonNull,
    weaknesses: Prisma.JsonNull,
    resistances: Prisma.JsonNull,
    retreatCost: [],
    rules: [],
    imageSmall: 'https://images.pokemontcg.io/base1/97.png',
    imageLarge: 'https://images.pokemontcg.io/base1/97_hires.png',
    setId: 'base1',
    setName: 'Base',
  },
  {
    id: 'base1-102',
    name: 'Water Energy',
    supertype: 'Energy',
    subtypes: ['Basic'],
    hp: null,
    types: ['Water'],
    abilities: Prisma.JsonNull,
    attacks: Prisma.JsonNull,
    weaknesses: Prisma.JsonNull,
    resistances: Prisma.JsonNull,
    retreatCost: [],
    rules: [],
    imageSmall: 'https://images.pokemontcg.io/base1/102.png',
    imageLarge: 'https://images.pokemontcg.io/base1/102_hires.png',
    setId: 'base1',
    setName: 'Base',
  },
  {
    id: 'base1-99',
    name: 'Grass Energy',
    supertype: 'Energy',
    subtypes: ['Basic'],
    hp: null,
    types: ['Grass'],
    abilities: Prisma.JsonNull,
    attacks: Prisma.JsonNull,
    weaknesses: Prisma.JsonNull,
    resistances: Prisma.JsonNull,
    retreatCost: [],
    rules: [],
    imageSmall: 'https://images.pokemontcg.io/base1/99.png',
    imageLarge: 'https://images.pokemontcg.io/base1/99_hires.png',
    setId: 'base1',
    setName: 'Base',
  },
];

async function main() {
  console.log('Seeding database...');

  for (const card of sampleCards) {
    await prisma.card.upsert({
      where: { id: card.id },
      update: card,
      create: card,
    });
    console.log(`Seeded: ${card.name}`);
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
