import { IsNotEmpty, IsString } from 'class-validator';

export class UpdateTaxonomyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
