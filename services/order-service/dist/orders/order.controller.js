import { CreateOrderSchema } from "./order.schema.js";
import { OrderService } from "./order.services.js";
export const OrderController = {
    async createOrder(req, res) {
        try {
            const userId = req.headers["x-user-id"];
            if (!userId) {
                return res.status(401).json({ success: false, error: "Unauthorized: Missing user credentials from Gateway" });
            }
            const { productId, quantity } = CreateOrderSchema.parse(req.body);
            const order = await OrderService.createOrder(userId, productId, quantity);
            res.status(202).json({ success: true, message: "Order placed and is being processed", data: order });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },
    async getOrdersByUser(req, res) {
        try {
            const userId = req.headers["x-user-id"];
            if (!userId) {
                return res.status(401).json({ success: false, error: "Unauthorized: Missing user credentials from Gateway" });
            }
            const orders = await OrderService.getOrdersByUser(userId);
            res.json({ success: true, data: orders });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
};
