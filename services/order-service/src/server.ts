import express, { Request, Response } from "express";
import route from "./orders/order.routes.js";
import { OrderService } from "./orders/order.services.js";
import { ConsulRegistry } from "./lib/consul.js";

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.use("/orders", route);

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "UP", service: "order-service" });
});

const server = app.listen(PORT, async () => {
  console.log(`Order Service is running on port ${PORT}`);
  try {
    await OrderService.listenForFeedback();
    console.log("📥 Order Service is listening for RabbitMQ feedback events");
  } catch (err) {
    console.error("❌ Failed to start RabbitMQ consumers in Order Service:", err);
  }
  await ConsulRegistry.register("order-service", Number(PORT));
});

const handleShutdown = async () => {
  await ConsulRegistry.deregister();
  server.close(() => {
    console.log("HTTP server closed");
    process.exit(0);
  });
};

process.on("SIGINT", handleShutdown);
process.on("SIGTERM", handleShutdown);
