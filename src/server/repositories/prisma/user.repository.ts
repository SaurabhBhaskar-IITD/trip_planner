import "server-only";
import { prisma } from "@/server/db/prisma";
import type { EntityId } from "@/domain/entities";
import type { AuthUserRecord, UserRepository } from "../ports/user.repository";

/**
 * Prisma-backed UserRepository. This is the only place auth touches persistence;
 * the domain never sees Prisma. Isolation of the ORM to this layer is the point
 * of the ports/adapters split.
 */
export class PrismaUserRepository implements UserRepository {
  async findActiveByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase(), active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        passwordHash: true,
        active: true,
      },
    });
    return user;
  }

  async touchLastLogin(id: EntityId): Promise<void> {
    await prisma.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }
}

export const userRepository: UserRepository = new PrismaUserRepository();
