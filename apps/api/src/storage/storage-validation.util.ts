import { BadRequestException } from '@nestjs/common';
import { extname } from 'node:path';
import {
  ALLOWED_EXTENSIONS_BY_CONTEXT,
  ALLOWED_MIME_TYPES_BY_CONTEXT,
  BLOCKED_EXECUTABLE_EXTENSIONS,
} from './storage.constants';
import { CreateUploadUrlInput } from './storage.types';

export interface StorageValidationLimits {
  readonly maxUploadSizeBytes: number;
}

/**
 * Valida um pedido de upload contra a configuração de limites do contexto,
 * antes de qualquer URL pré-assinado ser emitido (fase-2-integracao-armazenamento.md,
 * tarefa A/B). Lança `BadRequestException` na primeira violação encontrada.
 */
export function validateUploadRequest(
  input: CreateUploadUrlInput,
  limits: StorageValidationLimits,
): void {
  const extension = extname(input.fileName).toLowerCase();
  if (!extension) {
    throw new BadRequestException(
      'O ficheiro tem de ter uma extensão reconhecível.',
    );
  }

  if (BLOCKED_EXECUTABLE_EXTENSIONS.includes(extension)) {
    throw new BadRequestException(`A extensão "${extension}" não é permitida.`);
  }

  const allowedExtensions = ALLOWED_EXTENSIONS_BY_CONTEXT[input.context];
  if (!allowedExtensions.includes(extension)) {
    throw new BadRequestException(
      `A extensão "${extension}" não é permitida para este tipo de ficheiro.`,
    );
  }

  const allowedMimeTypes = ALLOWED_MIME_TYPES_BY_CONTEXT[input.context];
  if (!allowedMimeTypes.includes(input.mimeType)) {
    throw new BadRequestException(
      `O tipo "${input.mimeType}" não é permitido para este tipo de ficheiro.`,
    );
  }

  if (!Number.isFinite(input.sizeBytes) || input.sizeBytes <= 0) {
    throw new BadRequestException('O tamanho do ficheiro é inválido.');
  }

  if (input.sizeBytes > limits.maxUploadSizeBytes) {
    throw new BadRequestException(
      `O ficheiro excede o tamanho máximo permitido (${limits.maxUploadSizeBytes} bytes).`,
    );
  }
}
