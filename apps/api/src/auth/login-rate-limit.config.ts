const DEFAULT_LOGIN_RATE_LIMIT = 5;
const DEFAULT_LOGIN_RATE_TTL_SECONDS = 60;

// Lido diretamente de `process.env` (não via ConfigService) porque o valor é
// consumido pelo decorator `@Throttle()` em `auth.controller.ts`, avaliado à
// importação do módulo — antes de o Nest arrancar e validar a configuração.
// `main.ts` carrega `dotenv/config` como primeira instrução, precisamente
// para que este valor já esteja disponível nesse momento em desenvolvimento
// local (em produção/homologação as variáveis já vêm definidas no ambiente).
function parsePositiveInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export const LOGIN_RATE_LIMIT = parsePositiveInt(
  process.env['AUTH_LOGIN_RATE_LIMIT'],
  DEFAULT_LOGIN_RATE_LIMIT,
);
export const LOGIN_RATE_TTL_SECONDS = parsePositiveInt(
  process.env['AUTH_LOGIN_RATE_TTL_SECONDS'],
  DEFAULT_LOGIN_RATE_TTL_SECONDS,
);
