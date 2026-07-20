import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { seedResources } from './seeds/resources.seed';
import { seedSupportTickets } from './seeds/support-tickets.seed';
import { seedTaxonomies } from './seeds/taxonomies.seed';
import { seedTipsAndFaqs } from './seeds/tips-faqs.seed';
import { seedUsers } from './seeds/users.seed';

/**
 * Orquestrador dos seeds de desenvolvimento (Fase 2, BD). Idempotente: pode ser executado
 * repetidamente sobre a mesma base de dados sem duplicar nem falhar — cada módulo usa
 * `upsert` por uma chave estável (ver `docs/decisoes-seeds.md`).
 */
export async function runSeed(prisma: PrismaClient): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    throw new Error(
      'Os seeds de desenvolvimento não podem ser executados com NODE_ENV=production (coding-standards.md — "não criar contas demonstrativas em produção").',
    );
  }

  const taxonomies = await seedTaxonomies(prisma);
  const userIdByKey = await seedUsers(prisma);
  const resourceIdBySlug = await seedResources(prisma, {
    taxonomies,
    userIdByKey,
  });
  await seedTipsAndFaqs(prisma, { userIdByKey });
  await seedSupportTickets(prisma, { userIdByKey, resourceIdBySlug });
}

async function main(): Promise<void> {
  const prisma = new PrismaClient();
  try {
    await runSeed(prisma);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
