import { randomUUID } from 'node:crypto';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

const CODE_BY_STATUS: Readonly<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'VALIDATION_ERROR',
  [HttpStatus.UNAUTHORIZED]: 'UNAUTHORIZED',
  [HttpStatus.FORBIDDEN]: 'FORBIDDEN',
  [HttpStatus.NOT_FOUND]: 'NOT_FOUND',
  [HttpStatus.CONFLICT]: 'CONFLICT',
  [HttpStatus.TOO_MANY_REQUESTS]: 'RATE_LIMITED',
};

interface ApiErrorResponse {
  readonly code: string;
  readonly message: string;
  readonly fieldErrors?: Record<string, readonly string[]>;
  readonly correlationId: string;
  readonly timestamp: string;
}

/**
 * Formato conceptual de erro de `coding-standards.md`, aplicado a toda a API sem alterar os
 * pontos onde as exceções já existentes são lançadas (`NotFoundException`, `ConflictException`,
 * etc.) — só a forma da resposta HTTP muda, nunca o tipo de exceção nem a lógica de negócio.
 */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const status = exception.getStatus();
    const body = exception.getResponse();

    const { message, fieldErrors } = this.extractPayload(body);

    const payload: ApiErrorResponse = {
      code: CODE_BY_STATUS[status] ?? 'ERROR',
      message,
      ...(fieldErrors ? { fieldErrors } : {}),
      correlationId: randomUUID(),
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(payload);
  }

  private extractPayload(body: unknown): {
    message: string;
    fieldErrors?: Record<string, readonly string[]>;
  } {
    if (typeof body === 'string') {
      return { message: body };
    }
    if (typeof body === 'object' && body !== null) {
      const candidate = body as {
        message?: unknown;
        fieldErrors?: unknown;
      };
      const message = Array.isArray(candidate.message)
        ? candidate.message.join(' ')
        : typeof candidate.message === 'string'
          ? candidate.message
          : 'Não foi possível concluir o pedido.';
      const fieldErrors =
        typeof candidate.fieldErrors === 'object' &&
        candidate.fieldErrors !== null
          ? (candidate.fieldErrors as Record<string, readonly string[]>)
          : undefined;
      return { message, fieldErrors };
    }
    return { message: 'Não foi possível concluir o pedido.' };
  }
}
