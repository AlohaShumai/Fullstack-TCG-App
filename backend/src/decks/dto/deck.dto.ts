import { IsString, IsInt, Min, Max, MinLength } from 'class-validator';

export class CreateDeckDto {
  @IsString()
  @MinLength(1)
  name: string;
}

export class UpdateDeckDto {
  @IsString()
  @MinLength(1)
  name: string;
}

export class AddCardToDeckDto {
  @IsString()
  cardId: string;

  @IsInt()
  @Min(1)
  @Max(60)
  quantity: number;
}

export class UpdateDeckCardDto {
  @IsInt()
  @Min(0)
  @Max(60)
  quantity: number;
}
