import { execSync } from 'node:child_process';
import * as path from 'node:path';
import * as dotenv from 'dotenv';

const API_ROOT = path.resolve(__dirname, '../../..');

/**
 * Corre uma única vez, antes de toda a suite de integração: aplica as migrações e
 * semeia a base de dados de testes efémera (ver `docs/decisoes-seeds.md`), para que os
 * testes de queries e de restrições de negócio corram sobre dados reais e conhecidos.
 */
export default async function globalSetup(): Promise<void> {
  dotenv.config({ path: path.join(API_ROOT, '.env.test'), quiet: true });

  if (!process.env['DATABASE_URL']) {
    throw new Error(
      'DATABASE_URL não está definida para os testes de integração. Configure apps/api/.env.test ' +
        '(ver apps/api/.env.test.example) ou exporte a variável no ambiente antes de correr `test:integration`.',
    );
  }

  execSync('npx prisma migrate deploy', {
    cwd: API_ROOT,
    env: process.env,
    stdio: 'inherit',
  });

  // Carregados com `require` (não `import` estático nem dinâmico) por duas razões: (1) tanto
  // `prisma/seed.ts` (efeito secundário `import 'dotenv/config'`) como `@prisma/client`
  // (resolve a datasource já no próprio import) carregam `.env` assim que importados — um
  // `import` estático seria içado (hoisting) para antes do `dotenv.config` acima, fixando
  // `DATABASE_URL` no valor de desenvolvimento antes de `.env.test` poder ser aplicado; (2)
  // um `import()` dinâmico, neste projeto CommonJS (`module: nodenext`), é resolvido pelo
  // carregador ESM nativo do Node — que ignora a transformação `ts-jest` — e não pelo `require`
  // intercetado pelo Jest, pelo que falha a resolver módulos `.ts` sem extensão.
  /* eslint-disable @typescript-eslint/no-require-imports */
  const seedModule =
    require('../../../prisma/seed') as typeof import('../../../prisma/seed');
  const prismaClientModule =
    require('@prisma/client') as typeof import('@prisma/client');
  /* eslint-enable @typescript-eslint/no-require-imports */
  const { runSeed } = seedModule;
  const { PrismaClient } = prismaClientModule;

  const prisma = new PrismaClient();
  try {
    await runSeed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
