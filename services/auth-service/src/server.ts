import 'dotenv/config';
import express, { Request, Response } from 'express';
import router from './auth.module/auth.route';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'auth-service' });
});

app.use("/",router)

app.listen(PORT, () => {
  console.log(`Auth Service is running on port ${PORT}`);
});