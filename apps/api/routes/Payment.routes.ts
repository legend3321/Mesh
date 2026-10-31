import express from "express";
import verifyToken from "../middleware/App.middleware";
import PaymentController from "../controllers/Payment.controller";
import {
  validateBody,
  paymentSchema,
  paymentUpdateSchema,
} from "../middleware/Validation.middleware";

const PaymentRouter = express.Router();

// SEC-12: Input validated payment endpoints
PaymentRouter.post(
  "/add",
  verifyToken,
  validateBody(paymentSchema),
  PaymentController.addPayment
);
PaymentRouter.patch(
  "/edit",
  verifyToken,
  validateBody(paymentUpdateSchema),
  PaymentController.editPayment
);
PaymentRouter.get("/getAll", verifyToken, PaymentController.getAllPayments);
PaymentRouter.get("/get/:PaymentID", verifyToken, PaymentController.getPayment);
PaymentRouter.delete(
  "/delete/:PaymentID",
  verifyToken,
  PaymentController.deletePayment
);

export default PaymentRouter;
