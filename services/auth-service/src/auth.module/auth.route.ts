import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authMiddleware } from "../middlewares/atuth.middleware";

const router = Router();

router.get("/me", authMiddleware, AuthController.me);
router.post("/register", AuthController.register);
router.post("/login", AuthController.login);

export default router;