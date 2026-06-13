import express from 'express';
import route from './products/product.routes.js';
import { ProductService } from './products/product.services.js';
const app = express();
const PORT = process.env.PORT || 3002;
app.use(express.json());
app.use("/products", route);
app.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'product-service' });
});
app.listen(PORT, async () => {
    console.log(`Product Service is running on port ${PORT}`);
    try {
        await ProductService.listenForOrders();
        console.log("📥 Product Service is listening for RabbitMQ order events");
    }
    catch (err) {
        console.error("❌ Failed to start RabbitMQ consumers in Product Service:", err);
    }
});
