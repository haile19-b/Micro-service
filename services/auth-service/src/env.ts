import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

const EnvSchema = z.object({
  JWT_SECRET:z.string(),
})
export const env = EnvSchema.parse(process.env);