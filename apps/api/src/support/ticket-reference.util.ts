import { customAlphabet } from 'nanoid';

// Mesmo alfabeto/comprimento já usado por `SupportTicketMockService` na via de UI
// (Fase 6), reutilizado tal e qual aqui para não divergir entre as duas implementações
// (risco em aberto de `fase-2-bd-seeds-validacao.md`). Exclui carateres ambíguos
// (I, O, 0, 1) para facilitar a leitura/comunicação de uma referência por telefone.
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REFERENCE_RANDOM_LENGTH = 6;

const generateRandomPart = customAlphabet(
  REFERENCE_ALPHABET,
  REFERENCE_RANDOM_LENGTH,
);

/** Formato visual `SUP-AAAA-XXXXXX` de `project-spec.md` (secção J). */
const TICKET_REFERENCE_PATTERN = /^SUP-\d{4}-[0-9A-Z]{6}$/;

export function generateTicketReference(
  year: number = new Date().getUTCFullYear(),
): string {
  return `SUP-${year}-${generateRandomPart()}`;
}

export function isValidTicketReferenceFormat(reference: string): boolean {
  return TICKET_REFERENCE_PATTERN.test(reference);
}

/**
 * Gera uma referência não colidente com o conjunto de referências já existentes
 * (ex.: as já presentes na base de dados). A parte aleatória nunca é previsível,
 * conforme exigido por `project-spec.md`.
 */
export function generateUniqueTicketReference(
  existingReferences: ReadonlySet<string>,
  year: number = new Date().getUTCFullYear(),
): string {
  let reference = generateTicketReference(year);
  while (existingReferences.has(reference)) {
    reference = generateTicketReference(year);
  }
  return reference;
}
