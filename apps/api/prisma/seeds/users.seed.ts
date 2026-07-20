import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../../src/auth/password.util';
import { userSeedData } from '../seed-data/users.data';

/** Idempotente: `upsert` por `email` (tarefa B da especificação). */
export async function seedUsers(
  prisma: PrismaClient,
): Promise<ReadonlyMap<string, string>> {
  const userIdByKey = new Map<string, string>();

  for (const user of userSeedData) {
    const passwordHash = await hashPassword(user.password);

    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: { name: user.name, passwordHash, status: user.status },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        status: user.status,
      },
    });
    userIdByKey.set(user.key, record.id);

    for (const role of user.roles) {
      await prisma.userRole.upsert({
        where: { userId_role: { userId: record.id, role } },
        update: {},
        create: { userId: record.id, role },
      });
    }
  }

  return userIdByKey;
}
