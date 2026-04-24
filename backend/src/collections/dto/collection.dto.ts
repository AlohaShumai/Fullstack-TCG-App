import { IsString, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';

// POST /collections — create a new collection for the logged-in user
export class CreateCollectionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean; // public collections can be viewed by anyone with the link
}

// PATCH /collections/:id — partial update; all fields optional so the caller can change just the name, just isPublic, etc.
export class PatchCollectionDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

// POST /collections/:id/cards — add a card (defaults to quantity 1 if omitted)
export class AddToCollectionDto {
  @IsString()
  cardId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

// PATCH /collections/:id/cards/:cardId — set an exact quantity; quantity=0 removes the card entirely
export class UpdateCollectionDto {
  @IsInt()
  @Min(0)
  quantity: number;
}
