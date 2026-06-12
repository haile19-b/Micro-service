import { z } from "zod";

export const CreateOrderSchema = z.object({
  productId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid product ID format"),
  quantity: z.number().int().positive("Quantity must be a positive integer"),
});
