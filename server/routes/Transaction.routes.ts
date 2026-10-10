import express from "express";
import verifyToken from "../middleware/App.middleware";
import TransactionController from "../controllers/Transaction.controller";
const TransactionRouter = express.Router();

TransactionRouter.post(
  "/add",
  verifyToken,
  TransactionController.addTransaction
);
TransactionRouter.patch(
  "/edit",
  verifyToken,
  TransactionController.editTransaction
);
TransactionRouter.get("/getAll", TransactionController.getAllTransactions);
TransactionRouter.get(
  "/get/:TransactionID",
  TransactionController.getTransaction
);
TransactionRouter.delete(
  "/delete/:TransactionID",
  verifyToken,
  TransactionController.deleteTransaction
);

export default TransactionRouter;
