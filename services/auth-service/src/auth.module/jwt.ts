import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-super-secret-key";

export function signAccessToken(payload: { id: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "15m" });
}

// Pass both user ID and session ID to the refresh token
export function signRefreshToken(payload: { id: string; sessionId: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, JWT_SECRET);
}