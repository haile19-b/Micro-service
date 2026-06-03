import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../env";

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
    const decoded = jwt.verify(token, env.JWT_SECRET);
    (req as any).user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
}