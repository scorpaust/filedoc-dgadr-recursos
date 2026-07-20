import * as path from 'node:path';
import * as dotenv from 'dotenv';

// Corre por cada ficheiro de teste (Jest `setupFiles`), antes de qualquer `new PrismaClient()`
// no próprio teste. Em CI, `DATABASE_URL` já vem definida no ambiente do job — `dotenv` nunca
// substitui uma variável já definida, pelo que este ficheiro é inofensivo nesse cenário
// mesmo que `.env.test` não exista (o que acontece em CI, ver `.gitignore`).
dotenv.config({
  path: path.resolve(__dirname, '../../../.env.test'),
  quiet: true,
});

if (!process.env['DATABASE_URL']) {
  throw new Error(
    'DATABASE_URL não está definida para os testes de integração. Configure apps/api/.env.test ' +
      '(ver apps/api/.env.test.example) ou exporte a variável no ambiente antes de correr `test:integration`.',
  );
}
