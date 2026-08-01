import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ListAuditLogQueryDto } from './dto/list-audit-log-query.dto';
import {
  AUDIT_LOG_INCLUDE,
  AuditLogResponse,
  AuditLogSearchResponse,
  AuditLogWithActor,
  RecordAuditInput,
} from './audit.types';

const SYSTEM_ACTOR_LABEL = 'Sistema';

/**
 * Escrita e consulta de auditoria real (fase-8-integracao-administracao.md, tarefa B).
 * `record` nunca lança — uma falha ao escrever uma entrada de auditoria não pode interromper
 * a operação que a originou (coding-standards.md, "Logs e auditoria").
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          actorId: input.actorId,
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
          correlationId: input.correlationId,
        },
      });
    } catch (error) {
      this.logger.error(
        `Falha ao registar entrada de auditoria (${input.action}/${input.entityType}).`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  async list(query: ListAuditLogQueryDto): Promise<AuditLogSearchResponse> {
    const where: Prisma.AuditLogWhereInput = {};
    if (query.entityType) {
      where.entityType = query.entityType;
    }
    if (query.actorId) {
      where.actorId = query.actorId;
    }
    if (query.from || query.to) {
      where.createdAt = {
        ...(query.from ? { gte: new Date(query.from) } : {}),
        ...(query.to ? { lte: new Date(query.to) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        include: AUDIT_LOG_INCLUDE,
        orderBy: { createdAt: 'desc' },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return { items: items.map((item) => this.toResponse(item)), total };
  }

  private toResponse(item: AuditLogWithActor): AuditLogResponse {
    return {
      id: item.id,
      actor: item.actor?.name ?? SYSTEM_ACTOR_LABEL,
      action: item.action,
      entityType: item.entityType,
      entityId: item.entityId,
      metadata: (item.metadata as Record<string, unknown> | null) ?? undefined,
      correlationId: item.correlationId ?? undefined,
      createdAt: item.createdAt.toISOString(),
    };
  }
}
