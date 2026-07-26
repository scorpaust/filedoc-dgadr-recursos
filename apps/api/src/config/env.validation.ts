const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias
const MIN_SESSION_SECRET_LENGTH = 32;
const DEFAULT_CORS_ALLOWED_ORIGINS = 'http://localhost:4200';

export interface EnvironmentVariables {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  SESSION_SECRET: string;
  SESSION_TTL: number;
  CORS_ALLOWED_ORIGINS: readonly string[];
  TRUST_PROXY: boolean;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const nodeEnv =
    typeof config['NODE_ENV'] === 'string' ? config['NODE_ENV'] : 'development';

  const databaseUrl = config['DATABASE_URL'];
  if (typeof databaseUrl !== 'string' || databaseUrl.trim() === '') {
    throw new Error(
      'DATABASE_URL não está definida. Configure-a em apps/api/.env (ver apps/api/.env.example) antes de arrancar a aplicação.',
    );
  }

  const port = Number(config['PORT'] ?? 3000);
  if (Number.isNaN(port)) {
    throw new Error('PORT tem de ser um número válido.');
  }

  const sessionSecret = config['SESSION_SECRET'];
  if (
    typeof sessionSecret !== 'string' ||
    sessionSecret.trim().length < MIN_SESSION_SECRET_LENGTH
  ) {
    throw new Error(
      `SESSION_SECRET não está definida ou é demasiado curta (mínimo de ${MIN_SESSION_SECRET_LENGTH} carateres). ` +
        'Configure-a em apps/api/.env (ver apps/api/.env.example) antes de arrancar a aplicação.',
    );
  }

  const sessionTtl = Number(
    config['SESSION_TTL'] ?? DEFAULT_SESSION_TTL_SECONDS,
  );
  if (Number.isNaN(sessionTtl) || sessionTtl <= 0) {
    throw new Error('SESSION_TTL tem de ser um número de segundos positivo.');
  }

  const corsAllowedOriginsRaw = config['CORS_ALLOWED_ORIGINS'];
  const corsAllowedOrigins = (
    typeof corsAllowedOriginsRaw === 'string' &&
    corsAllowedOriginsRaw.trim() !== ''
      ? corsAllowedOriginsRaw
      : DEFAULT_CORS_ALLOWED_ORIGINS
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);
  if (corsAllowedOrigins.length === 0) {
    throw new Error(
      'CORS_ALLOWED_ORIGINS não pode resolver para uma lista vazia.',
    );
  }

  const trustProxy = config['TRUST_PROXY'] === 'true';

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: sessionSecret,
    SESSION_TTL: sessionTtl,
    CORS_ALLOWED_ORIGINS: corsAllowedOrigins,
    TRUST_PROXY: trustProxy,
  };
}
