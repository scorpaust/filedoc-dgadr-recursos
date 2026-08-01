import { Role } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsEnum } from 'class-validator';

// Substitui sempre o conjunto de funções — nunca aceita um array vazio (um utilizador tem de
// ter sempre pelo menos uma função, project-spec.md secção O).
export class AssignRolesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(Role, { each: true })
  roles!: Role[];
}
