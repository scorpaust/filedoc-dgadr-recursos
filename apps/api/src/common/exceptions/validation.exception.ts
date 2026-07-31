import { BadRequestException } from '@nestjs/common';

/**
 * Erro de validação de negócio (não de forma do pedido — essa já é tratada pelo
 * `ValidationPipe`, ver `common/validation-pipe.factory.ts`) com mensagens por campo,
 * devolvidas ao cliente como `fieldErrors` pelo `HttpExceptionFilter` global.
 */
export class ValidationException extends BadRequestException {
  constructor(
    message: string,
    fieldErrors: Readonly<Record<string, readonly string[]>>,
  ) {
    super({ message, fieldErrors });
  }
}
