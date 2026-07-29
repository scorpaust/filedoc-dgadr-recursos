import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

export const ATTACHMENT_PHASES = ['init', 'confirm'] as const;
export type AttachmentPhase = (typeof ATTACHMENT_PHASES)[number];

/**
 * Um único endpoint (`POST /tickets/mine/:id/attachments`, project-spec.md secção A) cobre
 * as duas fases do carregamento real de um anexo: `init` pede um URL pré-assinado ao
 * `StorageService` (Fase 2 — Integração); `confirm` é chamado depois de o cliente enviar os
 * bytes diretamente para o armazenamento, e só nessa fase o anexo é associado à mensagem.
 */
export class CreateAttachmentDto {
  @IsIn(ATTACHMENT_PHASES)
  phase!: AttachmentPhase;

  @IsString()
  @IsNotEmpty()
  messageId!: string;

  @IsString()
  @IsNotEmpty()
  fileName!: string;

  @IsString()
  @IsNotEmpty()
  mimeType!: string;

  @ValidateIf((dto: CreateAttachmentDto) => dto.phase === 'init')
  @IsInt()
  @Min(1)
  sizeBytes?: number;

  @ValidateIf((dto: CreateAttachmentDto) => dto.phase === 'confirm')
  @IsString()
  @IsNotEmpty()
  objectKey?: string;

  @ValidateIf((dto: CreateAttachmentDto) => dto.phase === 'confirm')
  @IsInt()
  @Min(1)
  size?: number;
}
