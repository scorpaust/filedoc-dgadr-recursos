import { IsString, MinLength } from 'class-validator';

const MIN_NEW_PASSWORD_LENGTH = 8;

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(MIN_NEW_PASSWORD_LENGTH)
  newPassword!: string;
}
