import { prisma } from '../lib/prisma.js';
import redis from '../lib/redis.js';
import RabbitMQ from '../lib/rabbitmq.js';


// Cache key constants — centralizing these prevents typos
const CACHE_KEYS = {
  allProducts: 'products:all',
  product: (id: string) => `products:${id}`,
};

const CACHE_TTL = 60; // seconds

export class ProductService {

  static async getAllProducts() {
    // 1. Check cache first
    const cached = await redis.get(CACHE_KEYS.allProducts);
    if (cached) {
      console.log('Cache HIT: products:all');
      return JSON.parse(cached);
    }

    // 2. Cache MISS: query database
    console.log('Cache MISS: products:all — querying DB');
    const products = await prisma.product.findMany();

    // 3. Store in Redis with TTL
    await redis.setex(CACHE_KEYS.allProducts, CACHE_TTL, JSON.stringify(products));

    return products;
  }

  static async getProductById(id: string) {
    const cacheKey = CACHE_KEYS.product(id);

    const cached = await redis.get(cacheKey);
    if (cached) {
      console.log(`Cache HIT: ${cacheKey}`);
      return JSON.parse(cached);
    }

    console.log(`Cache MISS: ${cacheKey} — querying DB`);
    const product = await prisma.product.findUnique({ where: { id } });

    if (product) {
      await redis.setex(cacheKey, CACHE_TTL, JSON.stringify(product));
    }

    return product;
  }

  static async createProduct(data: {
    name: string;
    description: string;
    price: number;
    stock: number;
  }) {
    // 1. Write to database
    const product = await prisma.product.create({ data });

    // 2. Invalidate the "all products" cache so next GET fetches fresh data
    await redis.del(CACHE_KEYS.allProducts);
    console.log('Cache INVALIDATED: products:all');

    return product;
  }

  static async reduceStock(id: string, quantity: number) {
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new Error("Product not found");
    }
    if (product.stock < quantity) {
      throw new Error("Insufficient stock");
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        stock: {
          decrement: quantity
        }
      }
    });

    // Invalidate the cache for this product and the list of all products
    await redis.del(CACHE_KEYS.product(id));
    await redis.del(CACHE_KEYS.allProducts);
    console.log(`Cache INVALIDATED for products:${id} and products:all due to stock reduction`);

    return updated;
  }

  static async listenForOrders() {
    await RabbitMQ.connect();

    await RabbitMQ.consumeMessage("order.created", async (payload: { orderId: string; productId: string; quantity: number }) => {
      const { orderId, productId, quantity } = payload;
      console.log(`📥 Processing stock reservation for Order ${orderId}`);

      try {
        // 1. IDEMPOTENCY GUARD: Check if this order was already processed
        const alreadyProcessed = await prisma.processedOrder.findUnique({
          where: { orderId }
        });

        if (alreadyProcessed) {
          console.warn(`⚠️ Order ${orderId} already processed. Skipping stock deduction.`);
          // Just send the success event again to ensure the order completes in case the previous message was lost
          const product = await prisma.product.findUnique({ where: { id: productId } });
          if (product) {
            const totalPrice = product.price * quantity;
            await RabbitMQ.publishMessage("order.stock.reserved", { orderId, totalPrice });
          }
          return;
        }

        // 2. Wrap database changes in a single local transaction
        const totalPrice = await prisma.$transaction(async (tx) => {
          const product = await tx.product.findUnique({ where: { id: productId } });
          if (!product) {
            throw new Error("Product not found");
          }

          if (product.stock < quantity) {
            throw new Error("Insufficient stock available");
          }

          // Deduct stock
          await tx.product.update({
            where: { id: productId },
            data: { stock: { decrement: quantity } }
          });

          // Record that we processed this order successfully
          await tx.processedOrder.create({
            data: { orderId }
          });

          return product.price * quantity;
        });

        // 3. Invalidate Redis Caches
        await redis.del(CACHE_KEYS.product(productId));
        await redis.del(CACHE_KEYS.allProducts);

        // 4. Publish success feedback event
        await RabbitMQ.publishMessage("order.stock.reserved", { orderId, totalPrice });

      } catch (error: any) {
        console.error(`❌ Stock reservation failed for Order ${orderId}:`, error.message);

        // Publish failure feedback event (triggers Compensation in Order Service)
        await RabbitMQ.publishMessage("order.stock.failed", { orderId, reason: error.message });
      }
    });
  }
}