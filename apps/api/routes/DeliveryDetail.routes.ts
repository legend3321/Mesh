import express from "express";
import verifyToken from "../middleware/App.middleware";
import DeliveryDetailController from "../controllers/DeliveryDetail.controller";
const DeliveryDetailRouter = express.Router();

DeliveryDetailRouter.post(
  "/add",
  verifyToken,
  DeliveryDetailController.addDeliveryDetail
);
DeliveryDetailRouter.patch(
  "/edit",
  verifyToken,
  DeliveryDetailController.editDeliveryDetail
);
DeliveryDetailRouter.get(
  "/getAll",
  verifyToken,
  DeliveryDetailController.getAllDeliveryDetails
);
DeliveryDetailRouter.get(
  "/get/:DeliveryDetailID",
  verifyToken,
  DeliveryDetailController.getDeliveryDetail
);
DeliveryDetailRouter.delete(
  "/delete/:DeliveryDetailID",
  verifyToken,
  DeliveryDetailController.deleteDeliveryDetail
);

export default DeliveryDetailRouter;
