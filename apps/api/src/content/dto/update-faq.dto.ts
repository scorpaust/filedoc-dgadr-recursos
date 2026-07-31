import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateFaqDto {
  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsNotEmpty()
  answer!: string;

  @IsOptional()
  @IsString()
  category?: string;
}
