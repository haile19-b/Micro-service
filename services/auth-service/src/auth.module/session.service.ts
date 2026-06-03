import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const SessionService = {
  async create(userId: string, refreshToken: string, userAgent?: string, ip?: string) {
    return prisma.session.create({
      data: {
        userId,
        token: refreshToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
        userAgent,
        ip,
        revoked: false
      }
    });
  },

  async findValid(refreshToken: string) {
    return prisma.session.findFirst({
      where: {
        token: refreshToken,
        revoked: false,
        expiresAt: { gt: new Date() }
      }
    });
  },

  async rotate(sessionId: string, newToken: string) {
    return prisma.session.update({
      where: { id: sessionId },
      data: {
        token: newToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7)
      }
    });
  },

  async revoke(sessionId: string) {
    return prisma.session.update({
      where: { id: sessionId },
      data: { revoked: true }
    });
  }
};