import express from "express";
import verifyToken from "../middleware/App.middleware";
import TransferController from "../controllers/Transfer.controller";
const TransferRouter = express.Router();

TransferRouter.post("/add", verifyToken, TransferController.addTransfer);
TransferRouter.patch("/edit", verifyToken, TransferController.editTransfer);
TransferRouter.get("/getAll", TransferController.getAllTransfers);
TransferRouter.get("/get/:TransferID", TransferController.getTransfer);
TransferRouter.delete(
  "/delete/:TransferID",
  verifyToken,
  TransferController.deleteTransfer
);

export default TransferRouter;
