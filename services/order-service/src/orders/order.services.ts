import { prisma } from "../lib/prisma.js";

const PRODUCT_SERVICE_URL = process.env.PRODUCT_SERVICE_URL || "http://localhost:3002";

export class OrderService {
  static async createOrder(userId: string, productId: string, quantity: number) {
    // 1. Sync HTTP call to Product Service: Check product details & stock
    const productRes = await fetch(`${PRODUCT_SERVICE_URL}/products/${productId}`);
    if (productRes.status === 404) {
      throw new Error("Product not found");
    }
    if (!productRes.ok) {
      throw new Error("Failed to fetch product details from Product Service");
    }

    const { data: product } = await productRes.json();

    // 2. Validate stock availability
    if (product.stock < quantity) {
      throw new Error("Insufficient stock available");
    }

    // 3. Sync HTTP call to Product Service: Reduce product stock
    const reduceRes = await fetch(`${PRODUCT_SERVICE_URL}/products/${productId}/reduce-stock`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ quantity }),
    });

    if (!reduceRes.ok) {
      const errData = await reduceRes.json();
      throw new Error(errData.error || "Failed to reduce product stock");
    }

    // 4. Calculate total price and save Order to database
    const totalPrice = product.price * quantity;
    const order = await prisma.order.create({
      data: {
        userId,
        productId,
        quantity,
        totalPrice,
        status: "COMPLETED",
      },
    });

    return order;
  }

  static async getOrdersByUser(userId: string) {
    return prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }
}
