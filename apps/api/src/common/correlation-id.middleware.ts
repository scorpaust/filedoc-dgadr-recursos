import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const CORRELATION_ID_HEADER = 'x-correlation-id';

export interface RequestWithCorrelationId extends Request {
  correlationId?: string;
}

/**
 * Regista `X-Correlation-Id` em cada pedido (reaproveita o valor recebido do cliente,
 * quando presente, para permitir correlação ponta-a-ponta) — lido tanto por
 * `HttpExceptionFilter` (resposta de erro) como por `AuditInterceptor` (entradas de
 * auditoria), garantindo que ambos referem o mesmo identificador para o mesmo pedido.
 */
export function correlationIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const incoming = request.header(CORRELATION_ID_HEADER);
  const correlationId =
    incoming && incoming.trim().length > 0 ? incoming : randomUUID();
  (request as RequestWithCorrelationId).correlationId = correlationId;
  response.setHeader(CORRELATION_ID_HEADER, correlationId);
  next();
}
