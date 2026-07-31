import { IsNotEmpty, IsString } from 'class-validator';

export class CreateTaxonomyDto {
  @IsString()
  @IsNotEmpty()
  name!: string;
}
