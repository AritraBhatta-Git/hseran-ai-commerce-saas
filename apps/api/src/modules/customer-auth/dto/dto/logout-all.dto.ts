import { IsString } from 'class-validator';

export class LogoutAllDto {
  @IsString()
  customerId: string;
}