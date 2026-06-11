import { prisma } from '../lib/prisma.js';
import redis from '../lib/redis.js';


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
}