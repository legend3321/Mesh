import express from "express";
import verifyToken from "../middleware/App.middleware";
import TransferController from "../controllers/Transfer.controller";
const TransferRouter = express.Router();

TransferRouter.post("/add", verifyToken, TransferController.addTransfer);
TransferRouter.post("/receive", verifyToken, TransferController.receiveTransfer);
TransferRouter.patch(
  "/receive/:TransferID",
  verifyToken,
  TransferController.receiveTransfer
);
TransferRouter.patch("/edit", verifyToken, TransferController.editTransfer);
TransferRouter.get("/getAll", verifyToken, TransferController.getAllTransfers);
TransferRouter.get("/get/:TransferID", verifyToken, TransferController.getTransfer);
TransferRouter.delete(
  "/delete/:TransferID",
  verifyToken,
  TransferController.deleteTransfer
);

export default TransferRouter;
