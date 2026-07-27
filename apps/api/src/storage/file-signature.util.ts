interface FileSignatureDefinition {
  readonly matches: (buffer: Buffer) => boolean;
  readonly mimeTypes: readonly string[];
}

// Assinaturas ("magic bytes") suficientes para os contextos suportados por este módulo
// (fase-2-integracao-armazenamento.md, tarefa B). O par .docx/.xlsx partilha a mesma
// assinatura de contentor ZIP/OOXML — não é possível distinguir os dois só pelos
// primeiros bytes sem inspecionar a entrada central do ZIP, por isso ambos os tipos MIME
// são aceites para essa assinatura (decisão registada, suficiente para bloquear
// executáveis e ficheiros com o tipo declarado errado, que é o objetivo desta validação).
const FILE_SIGNATURES: readonly FileSignatureDefinition[] = [
  {
    matches: (buffer) =>
      buffer.length >= 5 &&
      buffer.subarray(0, 5).toString('latin1') === '%PDF-',
    mimeTypes: ['application/pdf'],
  },
  {
    matches: (buffer) =>
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47,
    mimeTypes: ['image/png'],
  },
  {
    matches: (buffer) =>
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff,
    mimeTypes: ['image/jpeg'],
  },
  {
    matches: (buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
      buffer.subarray(8, 12).toString('latin1') === 'WEBP',
    mimeTypes: ['image/webp'],
  },
  {
    matches: (buffer) =>
      buffer.length >= 8 && buffer.subarray(4, 8).toString('latin1') === 'ftyp',
    mimeTypes: ['video/mp4'],
  },
  {
    matches: (buffer) =>
      buffer.length >= 4 &&
      buffer[0] === 0x1a &&
      buffer[1] === 0x45 &&
      buffer[2] === 0xdf &&
      buffer[3] === 0xa3,
    mimeTypes: ['video/webm'],
  },
  {
    matches: (buffer) =>
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07),
    mimeTypes: [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
  },
];

export function detectFileSignatureMimeTypes(
  buffer: Buffer,
): readonly string[] | null {
  const signature = FILE_SIGNATURES.find((candidate) =>
    candidate.matches(buffer),
  );
  return signature ? signature.mimeTypes : null;
}

/** Heurística best-effort para texto simples: sem sinal de conteúdo binário. */
function looksLikePlainText(buffer: Buffer): boolean {
  return !buffer.subarray(0, 512).includes(0x00);
}

/**
 * Confirma se o conteúdo real do ficheiro (assinatura/magic bytes) corresponde ao tipo
 * MIME declarado no pedido de upload — nunca confiar apenas na extensão ou no
 * `Content-Type` fornecido pelo cliente (coding-standards.md).
 */
export function matchesDeclaredMimeType(
  buffer: Buffer,
  declaredMimeType: string,
): boolean {
  const signatureMimeTypes = detectFileSignatureMimeTypes(buffer);
  if (signatureMimeTypes) {
    return signatureMimeTypes.includes(declaredMimeType);
  }
  if (declaredMimeType === 'text/plain') {
    return looksLikePlainText(buffer);
  }
  return false;
}
