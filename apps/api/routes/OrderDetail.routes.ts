import express from "express";
import verifyToken from "../middleware/App.middleware";
import OrderDetailController from "../controllers/OrderDetail.controller";
const OrderDetailRouter = express.Router();

OrderDetailRouter.post(
  "/add",
  verifyToken,
  OrderDetailController.addOrderDetail
);
OrderDetailRouter.patch(
  "/edit",
  verifyToken,
  OrderDetailController.editOrderDetail
);
OrderDetailRouter.get("/getAll", OrderDetailController.getAllOrderDetails);
OrderDetailRouter.get(
  "/get/:OrderDetailID",
  OrderDetailController.getOrderDetail
);
OrderDetailRouter.delete(
  "/delete/:OrderDetailID",
  verifyToken,
  OrderDetailController.deleteOrderDetail
);

export default OrderDetailRouter;
