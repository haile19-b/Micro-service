import express, { Request, Response } from 'express';
import route from './router/router';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'api-gateway' }); // Fixed: was "auth-service"
});

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'api-gateway' });
});

app.use("/api", route)

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`); // Fixed log message
});