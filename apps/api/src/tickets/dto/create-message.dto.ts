import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

const MAX_CONTENT_LENGTH = 5000;

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(MAX_CONTENT_LENGTH)
  content!: string;
}
