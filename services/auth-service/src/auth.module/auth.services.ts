import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { signAccessToken, signRefreshToken } from './jwt.js'; // Remember the .js extension!
import { SessionService } from './session.service.js';
import { ObjectId } from 'mongodb'; // MongoDB ID generator or a generic UUID generator

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

    const sessionId = new ObjectId().toString(); // Generate the ID first

    const accessToken = signAccessToken({ id: user.id });
    const refreshToken = signRefreshToken({ id: user.id, sessionId });

    const session = await SessionService.create(
      sessionId,
      user.id,
      refreshToken,
      userAgent,
      ip
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
    const sessionId = new ObjectId().toString(); // Generate the ID first

    const accessToken = signAccessToken({ id: user.id });
    const refreshToken = signRefreshToken({ id: user.id, sessionId });

    const session = await SessionService.create(
      sessionId,
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
    try {
      // 1. Verify and decode the token
      const payload = jwt.verify(refreshToken, JWT_SECRET) as any;
      const sessionId = payload.sessionId;

      // 2. Fetch the session from the DB by its ID (not by the token string)
      const session = await prisma.session.findUnique({
        where: { id: sessionId }
      });

      // 3. If no session exists or it is already revoked, block
      if (!session || session.revoked) {
        return { success: false, error: "Invalid or expired session" };
      }

      // 4. CHECK FOR REUSE (Token Replay Attack)
      if (session.token !== refreshToken) {
        // Someone is presenting an old refresh token that was already rotated!
        // Revoke the session immediately to lock out the attacker
        await SessionService.revoke(sessionId);
        console.warn(`SECURITY WARNING: Replay attack detected for session ${sessionId}. Revoking session.`);
        return { success: false, error: "Compromised session. Please login again." };
      }

      // 5. Check if session has expired
      if (new Date() > session.expiresAt) {
        await SessionService.revoke(sessionId);
        return { success: false, error: "Session expired" };
      }

      // 6. Normal Flow: Generate new tokens
      const newAccess = signAccessToken({ id: payload.id });
      const newRefresh = signRefreshToken({ id: payload.id, sessionId });

      // Rotate: Save the new refresh token in the database
      await SessionService.rotate(sessionId, newRefresh);

      return {
        success: true,
        response: {
          accessToken: newAccess,
          refreshToken: newRefresh
        }
      };
    } catch (err) {
      return { success: false, error: "Invalid refresh token" };
    }
  },

  async logout(refreshToken: string) {
    try {
      // Decode the token to get the sessionId
      const payload = jwt.verify(refreshToken, JWT_SECRET) as any;
      const sessionId = payload.sessionId;

      // Revoke the session in the database
      await SessionService.revoke(sessionId);

      return { success: true, message: "Logged out successfully" };
    } catch (err) {
      // Even if the token is invalid or expired, we return success 
      // because the user is effectively "logged out" anyway.
      return { success: true, message: "Logged out successfully" };
    }
  },

  async logoutAll(userId: string) {
    try {
      await prisma.session.updateMany({
        where: { userId, revoked: false },
        data: { revoked: true }
      });
      return { success: true, message: "Logged out of all devices successfully" };
    } catch (error: any) {
      return { success: false, error: error.message };
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