import { Router } from "express";
import { AuthController } from "./auth.controller";
import { authMiddleware } from "../middlewares/atuth.middleware";

const router = Router();

router.get("/me", authMiddleware, AuthController.me);
router.post("/register", AuthController.register);
router.post("/refresh", AuthController.refresh);
router.post("/login", AuthController.login);
router.post("/logout",AuthController.logout)
router.post("/logout-all",AuthController.logoutAll)

export default router;