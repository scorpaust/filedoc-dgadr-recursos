const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 dias
const MIN_SESSION_SECRET_LENGTH = 32;
const DEFAULT_CORS_ALLOWED_ORIGINS = 'http://localhost:4200';

// Fase 2 (Integração) — Armazenamento de Ficheiros (storage/).
const DEFAULT_STORAGE_REGION = 'us-east-1'; // ignorado pelo MinIO, exigido pelo SDK
const DEFAULT_MAX_UPLOAD_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB
const DEFAULT_MAX_ATTACHMENTS_PER_TICKET = 5;
const DEFAULT_STORAGE_MULTIPART_THRESHOLD_BYTES = 100 * 1024 * 1024; // 100 MB, ver riscos em aberto de fase-2-integracao-armazenamento.md
const DEFAULT_STORAGE_MULTIPART_PART_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB, acima do mínimo de 5 MB exigido pelo protocolo S3
const DEFAULT_STORAGE_UPLOAD_URL_TTL_SECONDS = 15 * 60; // 15 minutos
const DEFAULT_STORAGE_DOWNLOAD_URL_TTL_SECONDS = 60 * 60; // 1 hora, ver riscos em aberto de fase-2-integracao-armazenamento.md
const DEFAULT_STORAGE_ORPHAN_GRACE_PERIOD_SECONDS = 24 * 60 * 60; // 24 horas

export interface EnvironmentVariables {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
  SESSION_SECRET: string;
  SESSION_TTL: number;
  CORS_ALLOWED_ORIGINS: readonly string[];
  TRUST_PROXY: boolean;
  STORAGE_ENDPOINT: string;
  STORAGE_REGION: string;
  STORAGE_BUCKET: string;
  STORAGE_ACCESS_KEY: string | undefined;
  STORAGE_SECRET_KEY: string | undefined;
  STORAGE_FORCE_PATH_STYLE: boolean;
  MAX_UPLOAD_SIZE: number;
  MAX_ATTACHMENTS_PER_TICKET: number;
  STORAGE_MULTIPART_THRESHOLD_BYTES: number;
  STORAGE_MULTIPART_PART_SIZE_BYTES: number;
  STORAGE_UPLOAD_URL_TTL_SECONDS: number;
  STORAGE_DOWNLOAD_URL_TTL_SECONDS: number;
  STORAGE_ORPHAN_GRACE_PERIOD_SECONDS: number;
  RETENTION_POLICY_DAYS: number | undefined;
}

function requireNonEmptyString(
  config: Record<string, unknown>,
  key: string,
): string {
  const value = config[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(
      `${key} não está definida. Configure-a em apps/api/.env (ver apps/api/.env.example) antes de arrancar a aplicação.`,
    );
  }
  return value;
}

function readOptionalNonEmptyString(
  config: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = config[key];
  if (typeof value !== 'string' || value.trim() === '') {
    return undefined;
  }
  return value;
}

function readPositiveInt(
  config: Record<string, unknown>,
  key: string,
  defaultValue: number,
): number {
  const raw = config[key];
  const value = raw === undefined ? defaultValue : Number(raw);
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${key} tem de ser um número positivo.`);
  }
  return value;
}

/** Como `readPositiveInt`, mas aceita zero — usado por limites onde "0" tem
 * significado próprio (ex. sem janela de graça para objetos órfãos). */
function readNonNegativeInt(
  config: Record<string, unknown>,
  key: string,
  defaultValue: number,
): number {
  const raw = config[key];
  const value = raw === undefined ? defaultValue : Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${key} tem de ser um número igual ou superior a zero.`);
  }
  return value;
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

  const storageEndpoint = requireNonEmptyString(config, 'STORAGE_ENDPOINT');
  const storageBucket = requireNonEmptyString(config, 'STORAGE_BUCKET');
  // Opcionais: MinIO local exige-as (credenciais fixas); num ambiente AWS real,
  // omitir ambas para que o SDK use a cadeia de credenciais por omissão (a Task
  // Role do ECS, sem chaves fixas a gerir — ver guia-aws-deployment.md, Secção 4).
  const storageAccessKey = readOptionalNonEmptyString(
    config,
    'STORAGE_ACCESS_KEY',
  );
  const storageSecretKey = readOptionalNonEmptyString(
    config,
    'STORAGE_SECRET_KEY',
  );
  if ((storageAccessKey === undefined) !== (storageSecretKey === undefined)) {
    throw new Error(
      'STORAGE_ACCESS_KEY e STORAGE_SECRET_KEY têm de estar ambas definidas, ou ambas omissas (para usar a cadeia de credenciais por omissão do SDK AWS).',
    );
  }
  const storageRegion =
    typeof config['STORAGE_REGION'] === 'string' &&
    config['STORAGE_REGION'].trim() !== ''
      ? config['STORAGE_REGION']
      : DEFAULT_STORAGE_REGION;
  // Por omissão "true": necessário para MinIO e para qualquer S3 acedido por
  // endereço IP/hostname direto, não pelo formato de subdomínio por bucket.
  const storageForcePathStyle = config['STORAGE_FORCE_PATH_STYLE'] !== 'false';

  const maxUploadSize = readPositiveInt(
    config,
    'MAX_UPLOAD_SIZE',
    DEFAULT_MAX_UPLOAD_SIZE_BYTES,
  );
  const maxAttachmentsPerTicket = readPositiveInt(
    config,
    'MAX_ATTACHMENTS_PER_TICKET',
    DEFAULT_MAX_ATTACHMENTS_PER_TICKET,
  );
  const storageMultipartThresholdBytes = readPositiveInt(
    config,
    'STORAGE_MULTIPART_THRESHOLD_BYTES',
    DEFAULT_STORAGE_MULTIPART_THRESHOLD_BYTES,
  );
  const storageMultipartPartSizeBytes = readPositiveInt(
    config,
    'STORAGE_MULTIPART_PART_SIZE_BYTES',
    DEFAULT_STORAGE_MULTIPART_PART_SIZE_BYTES,
  );
  const storageUploadUrlTtlSeconds = readPositiveInt(
    config,
    'STORAGE_UPLOAD_URL_TTL_SECONDS',
    DEFAULT_STORAGE_UPLOAD_URL_TTL_SECONDS,
  );
  const storageDownloadUrlTtlSeconds = readPositiveInt(
    config,
    'STORAGE_DOWNLOAD_URL_TTL_SECONDS',
    DEFAULT_STORAGE_DOWNLOAD_URL_TTL_SECONDS,
  );
  const storageOrphanGracePeriodSeconds = readNonNegativeInt(
    config,
    'STORAGE_ORPHAN_GRACE_PERIOD_SECONDS',
    DEFAULT_STORAGE_ORPHAN_GRACE_PERIOD_SECONDS,
  );

  // Sem prazo institucional de retenção confirmado pela DGADR (ver
  // project-spec.md, "Privacidade e RGPD") — por omissão fica por definir
  // (undefined, não um número inventado), e o processo de aplicação da
  // política é manual nesta fase (ver docs/privacidade-rgpd.md).
  const retentionPolicyDaysRaw = config['RETENTION_POLICY_DAYS'];
  const retentionPolicyDays =
    typeof retentionPolicyDaysRaw === 'string' &&
    retentionPolicyDaysRaw.trim() !== ''
      ? Number(retentionPolicyDaysRaw)
      : undefined;
  if (
    retentionPolicyDays !== undefined &&
    (!Number.isFinite(retentionPolicyDays) || retentionPolicyDays <= 0)
  ) {
    throw new Error(
      'RETENTION_POLICY_DAYS, se definida, tem de ser um número de dias positivo.',
    );
  }

  return {
    NODE_ENV: nodeEnv,
    PORT: port,
    DATABASE_URL: databaseUrl,
    SESSION_SECRET: sessionSecret,
    SESSION_TTL: sessionTtl,
    CORS_ALLOWED_ORIGINS: corsAllowedOrigins,
    TRUST_PROXY: trustProxy,
    STORAGE_ENDPOINT: storageEndpoint,
    STORAGE_REGION: storageRegion,
    STORAGE_BUCKET: storageBucket,
    STORAGE_ACCESS_KEY: storageAccessKey,
    STORAGE_SECRET_KEY: storageSecretKey,
    STORAGE_FORCE_PATH_STYLE: storageForcePathStyle,
    MAX_UPLOAD_SIZE: maxUploadSize,
    MAX_ATTACHMENTS_PER_TICKET: maxAttachmentsPerTicket,
    STORAGE_MULTIPART_THRESHOLD_BYTES: storageMultipartThresholdBytes,
    STORAGE_MULTIPART_PART_SIZE_BYTES: storageMultipartPartSizeBytes,
    STORAGE_UPLOAD_URL_TTL_SECONDS: storageUploadUrlTtlSeconds,
    STORAGE_DOWNLOAD_URL_TTL_SECONDS: storageDownloadUrlTtlSeconds,
    STORAGE_ORPHAN_GRACE_PERIOD_SECONDS: storageOrphanGracePeriodSeconds,
    RETENTION_POLICY_DAYS: retentionPolicyDays,
  };
}
