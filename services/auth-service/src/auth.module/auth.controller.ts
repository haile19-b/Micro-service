import type { Request, Response } from "express";
import {
  LoginSchema,
  RefreshSchema,
  ActivateAccountSchema,
  RegisterSchema,
} from "./auth.schema";
import { AuthService } from "./auth.services";

export const AuthController = {
  async register(req: Request, res: Response) {
    try {
      const { email, password, userName, fullName } = RegisterSchema.parse(req.body);
      const result = await AuthService.register(email, password, userName, fullName, req.ip, req.headers["user-agent"]);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.status(201).json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async login(req: Request, res: Response) {
    try {
      const { email, password } = LoginSchema.parse(req.body);

      const result = await AuthService.login(
        email,
        password,
        req.ip,
        req.headers["user-agent"],
      );

      if (!result.success) {
        return res.status(401).json(result);
      }
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = RefreshSchema.parse(req.body);
      const result = await AuthService.refresh(refreshToken);
      if (!result.success) {
        return res.status(401).json(result);
      }
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async logout(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ success: false, error: "Refresh token is required" });
      }

      const result = await AuthService.logout(refreshToken);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async logoutAll(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }

      const result = await AuthService.logoutAll(userId);
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async me(req: any, res: Response) {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized" });
      }
      const result = await AuthService.getProfile(userId);
      if (!result.success) {
        return res.status(400).json(result);
      }
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
};