import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, Role, UserStatus } from '@prisma/client';
import { hashPassword } from '../auth/password.util';
import { ValidationException } from '../common/exceptions/validation.exception';
import { PrismaService } from '../prisma/prisma.service';
import { assertCanRemoveAdminRole, LastAdminError } from './admin-guard.util';
import { AssignRolesDto } from './dto/assign-roles.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserNameDto } from './dto/update-user-name.dto';
import { generateTemporaryPassword } from './temporary-password.util';
import { USER_INCLUDE, UserResponse, UserWithRoles } from './users.types';

export const USER_NOT_FOUND_MESSAGE = 'Utilizador não encontrado.';
const LAST_ADMIN_ROLE_MESSAGE =
  'Não é possível remover a função de administrador do último utilizador que a possui.';
const LAST_ADMIN_DEACTIVATE_MESSAGE =
  'Não é possível desativar o último utilizador com a função de administrador.';
const CONCURRENT_CONFLICT_MESSAGE =
  'Não foi possível concluir a operação devido a outra alteração em curso. Tente novamente.';
const NO_ACCESS_LABEL = '—';

/**
 * Gestão real de utilizadores (fase-8-integracao-administracao.md, tarefa A). A remoção da
 * função `ADMIN` (via `assignRoles`) e a desativação do último `ADMIN` reutilizam
 * `assertCanRemoveAdminRole` (já testada na Fase 2 — BD), agora chamada dentro de uma
 * transação que bloqueia (`SELECT ... FOR UPDATE`) as linhas `UserRole` de `ADMIN` antes de
 * ler quantos administradores existem, para que dois pedidos concorrentes sobre os últimos
 * administradores nunca deixem o sistema sem nenhum `ADMIN` (ver `runAdminProtectedMutation`).
 */
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListUsersQueryDto): Promise<readonly UserResponse[]> {
    const where: Prisma.UserWhereInput = {};
    if (query.status !== 'all') {
      where.status =
        query.status === 'active' ? UserStatus.ACTIVE : UserStatus.INACTIVE;
    }
    if (query.roles && query.roles.length > 0) {
      where.roles = { some: { role: { in: query.roles } } };
    }
    const search = query.q?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      include: USER_INCLUDE,
      orderBy: { name: 'asc' },
    });
    return users.map((user) => this.toResponse(user));
  }

  async create(dto: CreateUserDto): Promise<UserResponse> {
    const email = dto.email.trim().toLowerCase();
    const passwordHash = await hashPassword(generateTemporaryPassword());

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email,
          passwordHash,
          roles: { create: dto.roles.map((role) => ({ role })) },
        },
        include: USER_INCLUDE,
      });
      return this.toResponse(user);
    } catch (error) {
      throw this.translateEmailConflict(error);
    }
  }

  async updateName(id: string, dto: UpdateUserNameDto): Promise<UserResponse> {
    await this.findAnyById(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { name: dto.name.trim() },
      include: USER_INCLUDE,
    });
    return this.toResponse(user);
  }

  async assignRoles(id: string, dto: AssignRolesDto): Promise<UserResponse> {
    await this.findAnyById(id);
    const targetWillKeepAdmin = dto.roles.includes(Role.ADMIN);

    const user = await this.runAdminProtectedMutation(
      id,
      targetWillKeepAdmin,
      LAST_ADMIN_ROLE_MESSAGE,
      { roles: [LAST_ADMIN_ROLE_MESSAGE] },
      async (tx) => {
        await tx.userRole.deleteMany({
          where: { userId: id, role: { notIn: dto.roles } },
        });
        await tx.userRole.createMany({
          data: dto.roles.map((role) => ({ userId: id, role })),
          skipDuplicates: true,
        });
        return tx.user.findUniqueOrThrow({
          where: { id },
          include: USER_INCLUDE,
        });
      },
    );
    return this.toResponse(user);
  }

  async activate(id: string): Promise<UserResponse> {
    await this.findAnyById(id);
    const user = await this.prisma.user.update({
      where: { id },
      data: { status: UserStatus.ACTIVE },
      include: USER_INCLUDE,
    });
    return this.toResponse(user);
  }

  // Desativar invalida de imediato as sessões existentes, na mesma transação
  // (project-spec.md, secção O; coding-standards.md, "Transações" — "altera funções e
  // invalida sessões").
  async deactivate(id: string): Promise<UserResponse> {
    await this.findAnyById(id);
    const user = await this.runAdminProtectedMutation(
      id,
      false,
      LAST_ADMIN_DEACTIVATE_MESSAGE,
      {},
      async (tx) => {
        await tx.user.update({
          where: { id },
          data: { status: UserStatus.INACTIVE },
        });
        await tx.session.updateMany({
          where: { userId: id, revokedAt: null },
          data: { revokedAt: new Date() },
        });
        return tx.user.findUniqueOrThrow({
          where: { id },
          include: USER_INCLUDE,
        });
      },
    );
    return this.toResponse(user);
  }

  async invalidateSessions(id: string): Promise<void> {
    await this.findAnyById(id);
    await this.prisma.session.updateMany({
      where: { userId: id, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Corre `mutation` dentro de uma transação que, quando `targetWillKeepAdmin` é falso,
   * primeiro bloqueia (`SELECT ... FOR UPDATE`) todas as linhas `UserRole` com `ADMIN` —
   * necessidade técnica documentada (coding-standards.md permite SQL parametrizado nesse
   * caso): o Prisma Client não expõe bloqueio de linhas (`FOR UPDATE`) através do query
   * builder, e é exatamente esse bloqueio pessimista que impede dois pedidos concorrentes
   * de lerem ambos "há mais do que um ADMIN" antes de qualquer um escrever, o que deixaria o
   * sistema sem nenhum `ADMIN` (o clássico "write skew"). O segundo pedido só continua depois
   * do primeiro terminar, e nessa altura já vê o número atualizado de administradores. Uma
   * falha de deadlock do Postgres nesse bloqueio (não esperada com um único `SELECT` sem
   * ordem ambígua, mas possível) é traduzida num erro de conflito amigável. */
  private async runAdminProtectedMutation<T>(
    targetUserId: string,
    targetWillKeepAdmin: boolean,
    blockedMessage: string,
    blockedFieldErrors: Readonly<Record<string, readonly string[]>>,
    mutation: (tx: Prisma.TransactionClient) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        if (!targetWillKeepAdmin) {
          const admins = await tx.$queryRaw<{ userId: string }[]>`
            SELECT "userId" FROM "UserRole" WHERE "role" = 'ADMIN' FOR UPDATE
          `;
          assertCanRemoveAdminRole(
            admins.map((admin) => admin.userId),
            targetUserId,
          );
        }
        return mutation(tx);
      });
    } catch (error) {
      if (error instanceof LastAdminError) {
        throw new ValidationException(blockedMessage, blockedFieldErrors);
      }
      if (this.isConcurrencyConflict(error)) {
        throw new ConflictException(CONCURRENT_CONFLICT_MESSAGE);
      }
      throw error;
    }
  }

  private isConcurrencyConflict(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2034'
    );
  }

  private async findAnyById(id: string): Promise<UserWithRoles> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: USER_INCLUDE,
    });
    if (!user) {
      throw new NotFoundException(USER_NOT_FOUND_MESSAGE);
    }
    return user;
  }

  private translateEmailConflict(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ValidationException(
        'Já existe um utilizador com este e-mail.',
        {
          email: ['Já existe um utilizador com este e-mail.'],
        },
      );
    }
    return error;
  }

  private toResponse(user: UserWithRoles): UserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      roles: user.roles.map((userRole) => userRole.role),
      status: user.status === UserStatus.ACTIVE ? 'active' : 'inactive',
      lastAccess: user.lastLoginAt
        ? user.lastLoginAt.toISOString()
        : NO_ACCESS_LABEL,
    };
  }
}
