import 'dotenv/config';
import express, { Request, Response } from 'express';
import router from './auth.module/auth.route';
import { ConsulRegistry } from './lib/consul';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'UP', service: 'auth-service' });
});

app.use("/",router)

const server = app.listen(PORT, async () => {
  console.log(`Auth Service is running on port ${PORT}`);
  await ConsulRegistry.register("auth-service", Number(PORT));
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