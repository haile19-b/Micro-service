import express, { Request, Response } from "express";
import route from "./orders/order.routes.js";

const app = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());

app.use("/", route);

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "UP", service: "order-service" });
});

app.listen(PORT, () => {
  console.log(`Order Service is running on port ${PORT}`);
});
