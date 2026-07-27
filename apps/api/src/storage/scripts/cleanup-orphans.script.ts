import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { OrphanCleanupService } from '../orphan-cleanup.service';

/**
 * Executável via `npm run storage:cleanup-orphans --workspace apps/api`. O agendamento
 * automático (cron do anfitrião, tarefa agendada da infraestrutura de homologação/
 * produção) é uma decisão de infraestrutura, deixada em aberto por
 * `fase-2-integracao-armazenamento.md` — mesmo princípio já aplicado a
 * `scripts/homolog/backup-postgres.sh` na Fase 5 (Deployment).
 */
async function run(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });
  try {
    const orphanCleanupService = app.get(OrphanCleanupService);
    const { removed } = await orphanCleanupService.cleanupOrphanObjects();
    console.log(`Limpeza concluída: ${removed.length} objeto(s) removido(s).`);
  } finally {
    await app.close();
  }
}

void run();
