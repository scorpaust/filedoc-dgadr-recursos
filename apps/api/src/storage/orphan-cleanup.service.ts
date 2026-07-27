import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from './storage.service';
import { OrphanCleanupResult } from './storage.types';

/**
 * Remove objetos no armazenamento sem referência ativa na base de dados (fase-2-
 * integracao-armazenamento.md, tarefa E). Um objeto arquivado continua referenciado
 * (arquivar não é eliminar, project-spec.md) e nunca é removido por esta rotina — só a
 * ausência de qualquer referência (`Resource`/`TicketAttachment`) torna um objeto órfão.
 *
 * Chamável tanto por um agendamento externo (ex. `npm run storage:cleanup-orphans`, ver
 * `scripts/cleanup-orphans.script.ts`) como no momento de eliminar/substituir um recurso
 * ou anexo — a decisão de agendamento automático é de infraestrutura, não deste módulo
 * (mesmo princípio já aplicado a `backup-postgres.sh` na Fase 5, Deployment).
 */
@Injectable()
export class OrphanCleanupService {
  private readonly logger = new Logger(OrphanCleanupService.name);

  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async cleanupOrphanObjects(): Promise<OrphanCleanupResult> {
    const gracePeriodSeconds = this.configService.get(
      'STORAGE_ORPHAN_GRACE_PERIOD_SECONDS',
      { infer: true },
    );
    const cutoff = Date.now() - gracePeriodSeconds * 1000;

    const [referencedKeys, objects] = await Promise.all([
      this.getReferencedObjectKeys(),
      this.storageService.listAllObjects(),
    ]);

    const removed: string[] = [];
    for (const object of objects) {
      if (referencedKeys.has(object.key)) {
        continue;
      }
      // Dá tempo a um upload recente ser associado a um recurso/ticket antes de o
      // considerar órfão — evita apagar um ficheiro que acabou de ser confirmado mas
      // cuja entidade de negócio ainda não foi guardada.
      if (object.lastModified.getTime() > cutoff) {
        continue;
      }
      await this.storageService.deleteObject(object.key);
      removed.push(object.key);
      this.logger.log(`Objeto órfão removido: ${object.key}`);
    }

    return { removed };
  }

  private async getReferencedObjectKeys(): Promise<ReadonlySet<string>> {
    const [resources, attachments] = await Promise.all([
      this.prisma.resource.findMany({
        select: {
          fileObjectKey: true,
          thumbnailObjectKey: true,
          captionObjectKey: true,
        },
      }),
      this.prisma.ticketAttachment.findMany({ select: { objectKey: true } }),
    ]);

    const keys = new Set<string>();
    for (const resource of resources) {
      if (resource.fileObjectKey) {
        keys.add(resource.fileObjectKey);
      }
      if (resource.thumbnailObjectKey) {
        keys.add(resource.thumbnailObjectKey);
      }
      if (resource.captionObjectKey) {
        keys.add(resource.captionObjectKey);
      }
    }
    for (const attachment of attachments) {
      keys.add(attachment.objectKey);
    }
    return keys;
  }
}
