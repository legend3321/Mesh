import express from "express";
import verifyToken from "../middleware/App.middleware";
import ProductController from "../controllers/Product.controller";
const productRouter = express.Router();

productRouter.post("/add", verifyToken, ProductController.addProduct);
productRouter.patch("/edit", verifyToken, ProductController.editProduct);
productRouter.get("/getAll", verifyToken, ProductController.getAllProducts);
productRouter.get("/get/:ProductID", verifyToken, ProductController.getProduct);
productRouter.delete(
  "/delete/:ProductID",
  verifyToken,
  ProductController.deleteProduct
);

export default productRouter;
