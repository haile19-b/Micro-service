import { Request, Response, NextFunction } from "express";
import { env } from "../env";
import { verifyToken } from "../auth.module/jwt";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  let token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    console.error(`[AuthMiddleware] Missing Token for request to ${req.url}`);
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const decoded = verifyToken(token);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}