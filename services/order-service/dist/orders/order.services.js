import { prisma } from "../lib/prisma.js";
import RabbitMQ from "../lib/rabbitmq.js";
export class OrderService {
    static async createOrder(userId, productId, quantity) {
        // 1. Create order as PENDING in local database
        const order = await prisma.order.create({
            data: {
                userId,
                productId,
                quantity,
                totalPrice: 0, // Will be computed and updated by Product Service feedback
                status: "PENDING",
            },
        });
        // 2. Publish "order.created" event asynchronously
        await RabbitMQ.publishMessage("order.created", {
            orderId: order.id,
            productId: order.productId,
            quantity: order.quantity,
            userId: order.userId,
        });
        return order;
    }
    static async getOrdersByUser(userId) {
        return prisma.order.findMany({
            where: { userId },
            orderBy: { createdAt: "desc" },
        });
    }
    static async listenForFeedback() {
        // Ensure connection is established
        await RabbitMQ.connect();
        // 1. Listen for successful stock reservation
        await RabbitMQ.consumeMessage("order.stock.reserved", async (payload) => {
            const { orderId, totalPrice } = payload;
            console.log(`🎯 Order ${orderId} stock reserved successfully. Completing order...`);
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: "COMPLETED",
                    totalPrice,
                },
            });
        });
        // 2. Listen for failed stock reservation
        await RabbitMQ.consumeMessage("order.stock.failed", async (payload) => {
            const { orderId, reason } = payload;
            console.log(`❌ Order ${orderId} stock reservation failed: ${reason}. Failing order...`);
            await prisma.order.update({
                where: { id: orderId },
                data: {
                    status: "FAILED",
                },
            });
        });
    }
}
