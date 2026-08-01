import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, tap } from 'rxjs';
import type { AuthenticatedRequest } from '../auth/auth.types';
import type { RequestWithCorrelationId } from '../common/correlation-id.middleware';
import { AUDIT_METADATA_KEY, AuditMetadata } from './audit.decorator';
import { AuditService } from './audit.service';

type AuditableRequest = AuthenticatedRequest & RequestWithCorrelationId;

/**
 * Interceptor global (registado como `APP_INTERCEPTOR` em `AuditModule`) — só atua quando o
 * handler tem `@Audit(...)`, aplicado retroativamente aos endpoints de escrita já construídos
 * nas Fases 1/6/7 sem alterar a lógica desses controllers/services (fase-8-integracao-
 * -administracao.md, tarefa B).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const metadata = this.reflector.get<AuditMetadata | undefined>(
      AUDIT_METADATA_KEY,
      context.getHandler(),
    );
    if (!metadata) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditableRequest>();
    return next.handle().pipe(
      tap((result) => {
        void this.auditService.record({
          actorId: request.user?.id,
          action: metadata.action,
          entityType: metadata.entityType,
          entityId: this.resolveEntityId(request, result),
          metadata: this.buildMetadata(metadata.metadataKeys, request.body),
          correlationId: request.correlationId,
        });
      }),
    );
  }

  private resolveEntityId(request: AuditableRequest, result: unknown): string {
    const paramId = (request.params as Record<string, string> | undefined)?.id;
    if (paramId) {
      return paramId;
    }
    if (this.hasStringId(result)) {
      return result.id;
    }
    return request.user?.id ?? 'desconhecido';
  }

  private hasStringId(value: unknown): value is { id: string } {
    return (
      typeof value === 'object' &&
      value !== null &&
      'id' in value &&
      typeof value.id === 'string'
    );
  }

  private buildMetadata(
    keys: readonly string[] | undefined,
    body: unknown,
  ): Record<string, unknown> | undefined {
    if (!keys || keys.length === 0) {
      return undefined;
    }
    const source = (body ?? {}) as Record<string, unknown>;
    const metadata: Record<string, unknown> = {};
    for (const key of keys) {
      if (key in source) {
        metadata[key] = source[key];
      }
    }
    return Object.keys(metadata).length > 0 ? metadata : undefined;
  }
}
