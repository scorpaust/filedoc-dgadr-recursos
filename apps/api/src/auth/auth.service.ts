import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Role } from '@prisma/client';
import { EnvironmentVariables } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password.util';
import { generateSessionToken, hashSessionToken } from './session-token.util';

const INVALID_CREDENTIALS_MESSAGE =
  'Não foi possível iniciar sessão. Verifique o e-mail e a palavra-passe.';
const INVALID_CURRENT_PASSWORD_MESSAGE =
  'Não foi possível alterar a palavra-passe. Verifique a palavra-passe atual e tente novamente.';

export interface AuthenticatedUser {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly roles: readonly Role[];
}

export interface SessionResult {
  readonly token: string;
  readonly expiresAt: Date;
  readonly user: AuthenticatedUser;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  // Mesma exceção genérica quer o e-mail não exista, quer a palavra-passe esteja
  // errada, quer a conta esteja inativa — nunca revelar qual destes casos ocorreu
  // (project-spec.md, secção "Autenticação").
  async login(email: string, password: string): Promise<SessionResult> {
    const normalizedEmail = email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { roles: true },
    });

    if (!user || user.status !== 'ACTIVE') {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    const passwordValid = await verifyPassword(user.passwordHash, password);
    if (!passwordValid) {
      throw new UnauthorizedException(INVALID_CREDENTIALS_MESSAGE);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    return this.createSession({
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((userRole) => userRole.role),
    });
  }

  async logout(token: string): Promise<void> {
    const tokenHash = this.hashToken(token);
    await this.prisma.session.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException(INVALID_CURRENT_PASSWORD_MESSAGE);
    }

    const currentPasswordValid = await verifyPassword(
      user.passwordHash,
      currentPassword,
    );
    if (!currentPasswordValid) {
      throw new UnauthorizedException(INVALID_CURRENT_PASSWORD_MESSAGE);
    }

    const passwordHash = await hashPassword(newPassword);
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });
  }

  private async createSession(user: AuthenticatedUser): Promise<SessionResult> {
    const token = generateSessionToken();
    const tokenHash = this.hashToken(token);
    const ttlSeconds = this.configService.get('SESSION_TTL', { infer: true });
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000);

    await this.prisma.session.create({
      data: { userId: user.id, tokenHash, expiresAt },
    });

    return { token, expiresAt, user };
  }

  private hashToken(token: string): string {
    return hashSessionToken(
      token,
      this.configService.get('SESSION_SECRET', { infer: true }),
    );
  }
}
