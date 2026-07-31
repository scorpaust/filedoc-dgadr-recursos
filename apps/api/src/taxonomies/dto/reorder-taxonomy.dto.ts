import { IsIn, IsNotEmpty, IsString } from 'class-validator';
import { REORDER_DIRECTIONS, type ReorderDirection } from '../taxonomies.types';

export class ReorderTaxonomyDto {
  @IsString()
  @IsNotEmpty()
  id!: string;

  @IsIn(REORDER_DIRECTIONS)
  direction!: ReorderDirection;
}
