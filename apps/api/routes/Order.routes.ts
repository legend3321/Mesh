import express from "express";
import verifyToken from "../middleware/App.middleware";
import OrderController from "../controllers/Order.controller";
const OrderRouter = express.Router();

OrderRouter.post("/add", verifyToken, OrderController.addOrder);
OrderRouter.patch("/edit", verifyToken, OrderController.editOrder);
OrderRouter.get("/getAll", verifyToken, OrderController.getAllOrders);
OrderRouter.get("/get/:OrderID", verifyToken, OrderController.getOrder);
OrderRouter.delete(
  "/delete/:OrderID",
  verifyToken,
  OrderController.deleteOrder
);

export default OrderRouter;
