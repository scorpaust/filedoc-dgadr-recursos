import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrphanCleanupService } from './orphan-cleanup.service';
import { StorageService } from './storage.service';

// Reutilizável, sem controller próprio — nenhuma funcionalidade concreta é integrada
// nesta fase (fase-2-integracao-armazenamento.md); StorageService/OrphanCleanupService
// ficam disponíveis para as fases seguintes (Catálogo, Suporte, Gestão de conteúdos).
@Module({
  imports: [PrismaModule],
  providers: [StorageService, OrphanCleanupService],
  exports: [StorageService, OrphanCleanupService],
})
export class StorageModule {}
