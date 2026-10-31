import express from "express";
import verifyToken from "../middleware/App.middleware";
import TransactionController from "../controllers/Transaction.controller";
const TransactionRouter = express.Router();

TransactionRouter.post(
  "/add",
  verifyToken,
  TransactionController.addTransaction
);
TransactionRouter.get(
  "/getAll",
  verifyToken,
  TransactionController.getAllTransactions
);
TransactionRouter.get(
  "/get/:TransactionID",
  verifyToken,
  TransactionController.getTransaction
);

// Transaction audit ledger hardening: Edits and deletions are forbidden (SOX / regulatory immutability)
TransactionRouter.all(["/edit", "/edit/*"], (_req, res) => {
  return res.status(405).json({
    error: "Method Not Allowed: Transaction records are immutable audit logs. Modifications are forbidden.",
  });
});

TransactionRouter.all(["/delete", "/delete/*"], (_req, res) => {
  return res.status(405).json({
    error: "Method Not Allowed: Transaction records are immutable audit logs. Deletions are forbidden.",
  });
});

export default TransactionRouter;
