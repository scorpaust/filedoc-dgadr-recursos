import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export const REORDER_DIRECTIONS = ['up', 'down'] as const;
export type ReorderDirection = (typeof REORDER_DIRECTIONS)[number];

/** Reutilizado por dicas e FAQ — mesma operação de troca com o vizinho imediato. */
export class ReorderContentDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsIn(REORDER_DIRECTIONS)
  direction!: ReorderDirection;
}
