import express, { Request, Response } from 'express';
import route from './products/product.routes';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.use("/products",route)

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'product-service' });
});

app.listen(PORT, () => {
  console.log(`Product Service is running on port ${PORT}`);
});