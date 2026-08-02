const DEFAULT_WRITE_RATE_LIMIT = 20;
const DEFAULT_WRITE_RATE_TTL_SECONDS = 60;

// Mesma técnica de `auth/login-rate-limit.config.ts`: lido diretamente de
// `process.env` (não via ConfigService) porque o valor é consumido por
// decorators `@Throttle()` avaliados à importação do módulo, antes de o Nest
// arrancar. Aplica-se aos endpoints de escrita mais expostos a um utilizador
// `EMPLOYEE` comum (a função mais numerosa, sem restrição por papel) — ver
// docs/auditoria-seguranca-fase-10.md.
function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const WRITE_RATE_LIMIT = parsePositiveInt(
  process.env['WRITE_RATE_LIMIT'],
  DEFAULT_WRITE_RATE_LIMIT,
);
export const WRITE_RATE_TTL_SECONDS = parsePositiveInt(
  process.env['WRITE_RATE_TTL_SECONDS'],
  DEFAULT_WRITE_RATE_TTL_SECONDS,
);
