import { Router, Request } from "express";
import { env } from "../env.js";
import proxy from 'express-http-proxy';
import { authMiddleware } from "../middleware/auth.js";
import { discoverService } from "../middleware/discoverService.js";

const route = Router();

// ─────────────────────────────────────────────────────────────────
// AUTH SERVICE ROUTES (Public — no gateway auth needed)
// These endpoints either don't need a token (/register, /login,
// /refresh, /logout) or manage their own auth internally (/me)
// ─────────────────────────────────────────────────────────────────
const authProxy = proxy((req: any) => req.targetUrl);
route.use('/auth', discoverService('auth-service'), authProxy);

// ─────────────────────────────────────────────────────────────────
// PRODUCT SERVICE ROUTES
// ─────────────────────────────────────────────────────────────────

const productProxy = proxy((req:any) => req.targetUrl, {
  // Since our gateway routes exactly match our product service routes,
  // we can pass req.url directly without prefix prepending.
  proxyReqPathResolver: (req) => {
    return req.url;
  }
});

// Public: Anyone can browse products
route.get('/products',discoverService('product-service'), productProxy);

route.get('/products/:id',discoverService('product-service'), productProxy);

// Protected: Only authenticated users can create products
// Gateway validates the Access Token, then injects x-user-id into headers
// The product-service trusts x-user-id because it's behind the private gateway
route.post('/products', authMiddleware,discoverService('product-service'), productProxy);

// ─────────────────────────────────────────────────────────────────
// ORDER SERVICE ROUTES (Protected — requires gateway auth)
// ─────────────────────────────────────────────────────────────────
const orderProxy = proxy((req: any) => req.targetUrl, {
  proxyReqPathResolver: (req) => {
    return `/orders${req.url}`;
  }
});

route.get('/orders', authMiddleware,discoverService('auth-service'), orderProxy);
route.post('/orders', authMiddleware,discoverService('auth-service'), orderProxy);

export default route;