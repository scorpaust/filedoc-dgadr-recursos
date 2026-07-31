import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTipDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}
