import { resolveServiceUrl } from "../lib/discovery";

// Middleware to resolve healthy service instance dynamically
export const discoverService = (serviceName: string) => {
  return async (req: any, res: any, next: any) => {
    try {
      const targetUrl = await resolveServiceUrl(serviceName);
      req.targetUrl = targetUrl; // Attach the chosen host to the request
      next();
    } catch (error: any) {
      res.status(503).json({ success: false, error: error.message });
    }
  };
};