import { Type } from 'class-transformer';
import {
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

export const RESOURCE_UPLOAD_CONTEXTS = [
  'video',
  'pdfGuide',
  'thumbnail',
] as const;
export type ResourceUploadContext = (typeof RESOURCE_UPLOAD_CONTEXTS)[number];

export const UPLOAD_PHASES = ['init', 'confirm'] as const;
export type UploadPhase = (typeof UPLOAD_PHASES)[number];

export class CompletedUploadPartDto {
  @IsInt()
  @Min(1)
  partNumber!: number;

  @IsString()
  @IsNotEmpty()
  eTag!: string;
}

/**
 * Mesmo padrão de `tickets/dto/create-attachment.dto.ts`: um único endpoint com duas fases
 * (`init`/`confirm`) — `init` pede o URL pré-assinado, `confirm` só é chamado depois de o
 * cliente enviar os bytes diretamente para o armazenamento.
 */
export class ResourceUploadUrlDto {
  @IsIn(RESOURCE_UPLOAD_CONTEXTS)
  context!: ResourceUploadContext;

  @IsIn(UPLOAD_PHASES)
  phase!: UploadPhase;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ValidateIf((dto: ResourceUploadUrlDto) => dto.phase === 'init')
  @IsInt()
  @Min(1)
  sizeBytes?: number;

  @ValidateIf((dto: ResourceUploadUrlDto) => dto.phase === 'confirm')
  @IsString()
  @IsNotEmpty()
  objectKey?: string;

  // Só presentes quando `init` devolveu `mode: 'multipart'`.
  @ValidateIf((dto: ResourceUploadUrlDto) => dto.uploadId !== undefined)
  @IsString()
  @IsNotEmpty()
  uploadId?: string;

  @ValidateIf((dto: ResourceUploadUrlDto) => dto.uploadId !== undefined)
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CompletedUploadPartDto)
  parts?: readonly CompletedUploadPartDto[];
}
