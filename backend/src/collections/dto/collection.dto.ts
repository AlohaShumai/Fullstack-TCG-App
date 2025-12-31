import { IsString, IsInt, Min } from 'class-validator';

export class AddToCollectionDto {
  @IsString()
  cardId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

export class UpdateCollectionDto {
  @IsInt()
  @Min(0)
  quantity: number;
}
