import {
  IsString,
  IsInt,
  Min,
  Max,
  MinLength,
  IsOptional,
  IsIn,
} from 'class-validator';

// POST /decks — create a blank deck; format defaults to 'unlimited' in DecksService if omitted
export class CreateDeckDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsOptional()
  @IsString()
  @IsIn(['standard', 'unlimited'])
  format?: string;
}

// PATCH /decks/:id — update name and/or format; all fields optional
// Note: changing format to 'standard' will fail if existing deck cards aren't Standard-legal
export class UpdateDeckDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(['standard', 'unlimited'])
  format?: string;
}

// POST /decks/:id/cards — add a card to a deck (enforces 60-card limit and 4-copy rule)
export class AddCardToDeckDto {
  @IsString()
  cardId: string;

  @IsInt()
  @Min(1)
  @Max(60)
  quantity: number;
}

// PATCH /decks/:id/cards/:cardId — set an exact copy count; quantity=0 removes the card from the deck
export class UpdateDeckCardDto {
  @IsInt()
  @Min(0)
  @Max(60)
  quantity: number;
}

// POST /decks/import — import a deck from a PTCGL/PTCGO-format text list
// deckList format example: "4 Charizard ex OBF 125\n2 Arcanine SSH 22\n..."
export class ImportDeckDto {
  @IsString()
  @MinLength(1)
  name: string;

  @IsString()
  @IsIn(['standard', 'unlimited'])
  format: string;

  @IsString()
  @MinLength(1)
  deckList: string; // raw deck-list text copied from the PTCGL client
}
