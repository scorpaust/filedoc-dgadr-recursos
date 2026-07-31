import {
  BadRequestException,
  ValidationError,
  ValidationPipe,
} from '@nestjs/common';

function toFieldErrors(
  errors: readonly ValidationError[],
): Record<string, readonly string[]> {
  const fieldErrors: Record<string, readonly string[]> = {};
  for (const error of errors) {
    if (error.constraints) {
      fieldErrors[error.property] = Object.values(error.constraints);
    }
  }
  return fieldErrors;
}

/**
 * Configuração partilhada do `ValidationPipe`, usada por `main.ts` e por todos os testes de
 * integração (que hoje recriam a mesma configuração — ver `test/integration/*.integration-spec.ts`).
 * O `exceptionFactory` traduz erros de forma do pedido em `fieldErrors`, consumidos pelo
 * `HttpExceptionFilter` global (`common/filters/http-exception.filter.ts`).
 */
export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    exceptionFactory: (errors) =>
      new BadRequestException({
        message: 'Existem campos inválidos.',
        fieldErrors: toFieldErrors(errors),
      }),
  });
}
