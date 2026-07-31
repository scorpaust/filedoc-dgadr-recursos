import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTipDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}
