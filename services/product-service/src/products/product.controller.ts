import type { Request, Response } from "express";
import { CreateProductSchema } from "./product.schema.js";
import { ProductService } from "./product.services.js";

export const ProductController = {
  async getAllProducts(req: Request, res: Response) {
    try {
      const products = await ProductService.getAllProducts();
      res.json({ success: true, data: products });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async getProductById(req: Request, res: Response) {
    try {
      const id = req.params.id as string;
      const product = await ProductService.getProductById(id);
      if (!product) {
        return res.status(404).json({ success: false, error: "Product not found" });
      }
      res.json({ success: true, data: product });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error.message });
    }
  },

  async createProduct(req: Request, res: Response) {
    try {
      const validatedData = CreateProductSchema.parse(req.body);
      const product = await ProductService.createProduct(validatedData);
      res.status(201).json({ success: true, data: product });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message });
    }
  },
};
