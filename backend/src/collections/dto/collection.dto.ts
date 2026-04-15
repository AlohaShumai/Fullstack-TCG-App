import { IsString, IsInt, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateCollectionDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isPublic?: boolean;
}

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

export class AddToCollectionDto {
  @IsString()
  cardId: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export class UpdateCollectionDto {
  @IsInt()
  @Min(0)
  quantity: number;
}
