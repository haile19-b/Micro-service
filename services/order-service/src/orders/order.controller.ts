import type { Request, Response } from "express";
import { CreateOrderSchema } from "./order.schema.js";
import { OrderService } from "./order.services.js";

export const OrderController = {
  async createOrder(req: Request, res: Response) {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing user credentials from Gateway" });
      }

      const { productId, quantity } = CreateOrderSchema.parse(req.body);

      const order = await OrderService.createOrder(userId, productId, quantity);
      res.status(201).json({ success: true, data: order });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },

  async getOrdersByUser(req: Request, res: Response) {
    try {
      const userId = req.headers["x-user-id"] as string;
      if (!userId) {
        return res.status(401).json({ success: false, error: "Unauthorized: Missing user credentials from Gateway" });
      }

      const orders = await OrderService.getOrdersByUser(userId);
      res.json({ success: true, data: orders });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },
};
