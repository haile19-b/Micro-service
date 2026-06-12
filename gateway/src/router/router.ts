import { Router, Request } from "express";
import { env } from "../env.js";
import proxy from 'express-http-proxy';
import { authMiddleware } from "../middleware/auth.js";

const route = Router();

const AUTH_SERVICE_URL = env.AUTH_SERVICE_URL;
const PRODUCT_SERVICE_URL = env.PRODUCT_SERVICE_URL;
const ORDER_SERVICE_URL = env.ORDER_SERVICE_URL;

// ─────────────────────────────────────────────────────────────────
// AUTH SERVICE ROUTES (Public — no gateway auth needed)
// These endpoints either don't need a token (/register, /login,
// /refresh, /logout) or manage their own auth internally (/me)
// ─────────────────────────────────────────────────────────────────
route.use('/auth', proxy(AUTH_SERVICE_URL));

// ─────────────────────────────────────────────────────────────────
// PRODUCT SERVICE ROUTES
// ─────────────────────────────────────────────────────────────────

const productProxy = proxy(PRODUCT_SERVICE_URL, {
  // Since our gateway routes exactly match our product service routes,
  // we can pass req.url directly without prefix prepending.
  proxyReqPathResolver: (req) => {
    return req.url;
  }
});

// Public: Anyone can browse products
route.get('/products', productProxy);

route.get('/products/:id', productProxy);

// Protected: Only authenticated users can create products
// Gateway validates the Access Token, then injects x-user-id into headers
// The product-service trusts x-user-id because it's behind the private gateway
route.post('/products', authMiddleware, productProxy);

// ─────────────────────────────────────────────────────────────────
// ORDER SERVICE ROUTES (Protected — requires gateway auth)
// ─────────────────────────────────────────────────────────────────
const orderProxy = proxy(ORDER_SERVICE_URL, {
  proxyReqPathResolver: (req) => {
    return req.url;
  }
});

route.use('/orders', authMiddleware, orderProxy);

export default route;