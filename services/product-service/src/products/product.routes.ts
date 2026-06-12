import { Router } from "express";
import { ProductController } from "./product.controller.js";

const route = Router();

route.get("/", ProductController.getAllProducts);
route.get("/:id", ProductController.getProductById);
route.post("/", ProductController.createProduct);
route.patch("/:id/reduce-stock", ProductController.reduceStock);

export default route;