import express from "express";
import verifyToken from "../middleware/App.middleware";
import GoodsReceiptController from "../controllers/GoodsReceipt.controller";

const goodsReceiptRouter = express.Router();

goodsReceiptRouter.post("/add", verifyToken, GoodsReceiptController.addGoodsReceipt);
goodsReceiptRouter.get("/getAll", verifyToken, GoodsReceiptController.getAllGoodsReceipts);
goodsReceiptRouter.get("/:GoodsReceiptID", verifyToken, GoodsReceiptController.getGoodsReceipt);

export default goodsReceiptRouter;
