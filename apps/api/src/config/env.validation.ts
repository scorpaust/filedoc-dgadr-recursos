export interface EnvironmentVariables {
  NODE_ENV: string;
  PORT: number;
  DATABASE_URL: string;
}

export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
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

  return {
    NODE_ENV:
      typeof config['NODE_ENV'] === 'string'
        ? config['NODE_ENV']
        : 'development',
    PORT: port,
    DATABASE_URL: databaseUrl,
  };
}
