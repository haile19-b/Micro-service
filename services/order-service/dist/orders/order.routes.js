import { Router } from "express";
import { OrderController } from "./order.controller.js";
const route = Router();
route.post("/", OrderController.createOrder);
route.get("/", OrderController.getOrdersByUser);
export default route;
