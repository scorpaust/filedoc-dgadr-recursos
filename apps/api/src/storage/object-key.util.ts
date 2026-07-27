import { randomBytes } from 'node:crypto';
import { extname } from 'node:path';
import { STORAGE_OBJECT_KEY_PREFIX_BY_CONTEXT } from './storage.constants';
import { StorageUploadContext } from './storage.types';

const RANDOM_PART_BYTES = 24;

/**
 * Gera uma chave de objeto não previsível: nem sequencial nem derivada do
 * nome original (coding-standards.md, secção "Armazenamento de ficheiros").
 * O nome original nunca é usado como parte da chave — é preservado apenas
 * como metadado pelo domínio que consumir este módulo (ex. `originalName`
 * em `TicketAttachment`, `fileObjectKey` em `Resource`).
 */
export function generateObjectKey(
  context: StorageUploadContext,
  fileName: string,
): string {
  const prefix = STORAGE_OBJECT_KEY_PREFIX_BY_CONTEXT[context];
  const extension = extname(fileName).toLowerCase();
  const unpredictablePart =
    randomBytes(RANDOM_PART_BYTES).toString('base64url');
  return `${prefix}/${unpredictablePart}${extension}`;
}
