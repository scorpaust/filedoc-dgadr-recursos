import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config/env.validation';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthenticatedRequest } from '../auth.types';
import { SESSION_COOKIE_NAME, hashSessionToken } from '../session-token.util';

const INVALID_SESSION_MESSAGE = 'Sessão inválida ou expirada.';

// Rejeita pedidos sem sessão válida (sem cookie, sessão inexistente, expirada,
// revogada, ou de um utilizador entretanto desativado) e anexa o utilizador
// autenticado ao pedido (coding-standards.md — nunca confiar em dados de
// utilizador enviados pelo cliente quando podem ser obtidos da sessão).
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = request.cookies?.[SESSION_COOKIE_NAME] as string | undefined;
    if (!token) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    const tokenHash = hashSessionToken(
      token,
      this.configService.get('SESSION_SECRET', { infer: true }),
    );
    const session = await this.prisma.session.findUnique({
      where: { tokenHash },
      include: { user: { include: { roles: true } } },
    });

    if (
      !session ||
      session.revokedAt !== null ||
      session.expiresAt.getTime() <= Date.now() ||
      session.user.status !== 'ACTIVE'
    ) {
      throw new UnauthorizedException(INVALID_SESSION_MESSAGE);
    }

    request.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      roles: session.user.roles.map((userRole) => userRole.role),
    };
    return true;
  }
}
