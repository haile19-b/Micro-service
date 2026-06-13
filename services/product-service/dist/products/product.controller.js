import { CreateProductSchema } from "./product.schema.js";
import { ProductService } from "./product.services.js";
export const ProductController = {
    async getAllProducts(req, res) {
        try {
            const products = await ProductService.getAllProducts();
            res.json({ success: true, data: products });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    async getProductById(req, res) {
        try {
            const id = req.params.id;
            const product = await ProductService.getProductById(id);
            if (!product) {
                return res.status(404).json({ success: false, error: "Product not found" });
            }
            res.json({ success: true, data: product });
        }
        catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },
    async createProduct(req, res) {
        try {
            const validatedData = CreateProductSchema.parse(req.body);
            const product = await ProductService.createProduct(validatedData);
            res.status(201).json({ success: true, data: product });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },
    async reduceStock(req, res) {
        try {
            const id = req.params.id;
            const { quantity } = req.body;
            if (typeof quantity !== "number" || quantity <= 0) {
                return res.status(400).json({ success: false, error: "Quantity must be a positive number" });
            }
            const product = await ProductService.reduceStock(id, quantity);
            res.json({ success: true, data: product });
        }
        catch (error) {
            res.status(400).json({ success: false, error: error.message });
        }
    },
};
