import { ExecutionContext, createParamDecorator } from '@nestjs/common';
import { AuthenticatedRequest, CurrentUserPayload } from '../auth.types';

// Só deve ser usado em rotas protegidas por AuthGuard, que garante que
// `request.user` está definido antes de o pedido chegar ao handler.
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): CurrentUserPayload => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user as CurrentUserPayload;
  },
);
