import { IsString, MinLength } from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @MinLength(3)
  name: string;
}
