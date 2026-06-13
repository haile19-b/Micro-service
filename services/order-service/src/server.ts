import express, { Request, Response } from "express";
import route from "./orders/order.routes.js";
import { OrderService } from "./orders/order.services.js";

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.use("/orders", route);

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "UP", service: "order-service" });
});

app.listen(PORT, async () => {
  console.log(`Order Service is running on port ${PORT}`);
  try {
    await OrderService.listenForFeedback();
    console.log("📥 Order Service is listening for RabbitMQ feedback events");
  } catch (err) {
    console.error("❌ Failed to start RabbitMQ consumers in Order Service:", err);
  }
});
