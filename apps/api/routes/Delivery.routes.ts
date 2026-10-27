import express from "express";
import verifyToken from "../middleware/App.middleware";
import DeliveryController from "../controllers/Delivery.controller";
const DeliveryRouter = express.Router();

DeliveryRouter.post("/add", verifyToken, DeliveryController.addDelivery);
DeliveryRouter.patch("/edit", verifyToken, DeliveryController.editDelivery);
DeliveryRouter.get("/getAll", verifyToken, DeliveryController.getAllDeliverys);
DeliveryRouter.get("/get/:DeliveryID", verifyToken, DeliveryController.getDelivery);
DeliveryRouter.delete(
  "/delete/:DeliveryID",
  verifyToken,
  DeliveryController.deleteDelivery
);

export default DeliveryRouter;
