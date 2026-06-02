import express, { Request, Response } from 'express';

const app = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'product-service' });
});

app.listen(PORT, () => {
  console.log(`Auth Service is running on port ${PORT}`);
});