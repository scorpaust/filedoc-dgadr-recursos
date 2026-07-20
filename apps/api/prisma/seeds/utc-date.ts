/**
 * Converte uma data (`AAAA-MM-DD`) ou data/hora local sem fuso (`AAAA-MM-DDTHH:mm:ss`) dos
 * dados de seed num `Date` UTC explícito — os dados de seed nunca incluem `Z`, para
 * permanecerem legíveis, mas a persistência deve ser sempre em UTC (`coding-standards.md`).
 */
export function toUtcDate(localDateOrDateTime: string): Date {
  const hasTimeComponent = localDateOrDateTime.includes('T');
  const isoUtc = hasTimeComponent
    ? `${localDateOrDateTime}Z`
    : `${localDateOrDateTime}T00:00:00Z`;
  return new Date(isoUtc);
}
