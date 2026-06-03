import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { signAccessToken, signRefreshToken } from './jwt.js'; // Remember the .js extension!
import { SessionService } from './session.service.js';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "fallback-super-secret-key";

export const AuthService = {
  async register(email: string, password: string, userName: string, fullName: string, ip?: string, userAgent?: string) {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { userName }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.email === email) return { success: false, error: "User already exists" };
      if (existingUser.userName === userName) return { success: false, error: "Username is already taken" };
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email,
        userName,
        fullName,
        password: passwordHash,
      }
    });

    const accessToken = signAccessToken({ id: user.id });
    const refreshToken = signRefreshToken({ id: user.id });

    const session = await SessionService.create(
      user.id,
      refreshToken,
      userAgent,
      ip,
    );

    return {
      success: true,
      response: {
        username: user.userName,
        email: user.email,
        fullName: user.fullName,
        accessToken,
        refreshToken,
        sessionId: session.id,
      }
    };
  },

  async login(email: string, password: string, ip?: string, userAgent?: string) {
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, error: "Invalid credentials" };
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return { success: false, error: "Invalid credentials" };
    }

    const accessToken = signAccessToken({ id: user.id });
    const refreshToken = signRefreshToken({ id: user.id });

    const session = await SessionService.create(
      user.id,
      refreshToken,
      userAgent,
      ip,
    );

    return {
      success: true,
      response: {
        username: user.userName,
        email: user.email,
        fullName: user.fullName,
        accessToken,
        refreshToken,
        sessionId: session.id,
      }
    };
  },

  async refresh(refreshToken: string) {
    const session = await SessionService.findValid(refreshToken);
    if (!session) return { success: false, error: "Invalid or expired refresh token" };

    try {
      const payload = jwt.verify(refreshToken, JWT_SECRET) as any;

      const newAccess = signAccessToken({ id: payload.id });
      const newRefresh = signRefreshToken({ id: payload.id });

      // Rotate token: update session with the new refresh token
      await SessionService.rotate(session.id, newRefresh);

      return {
        success: true,
        response: {
          accessToken: newAccess,
          refreshToken: newRefresh
        }
      };
    } catch (err) {
      return { success: false, error: "Invalid or expired refresh token" };
    }
  },

  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    if (!user) return { success: false, error: "User not found" };

    return {
      success: true,
      response: {
        username: user.userName,
        email: user.email,
        fullName: user.fullName,
      }
    };
  },
};