import express from "express";
import verifyToken from "../middleware/App.middleware";
import PaymentController from "../controllers/Payment.controller";
const PaymentRouter = express.Router();

PaymentRouter.post("/add", verifyToken, PaymentController.addPayment);
PaymentRouter.patch("/edit", verifyToken, PaymentController.editPayment);
PaymentRouter.get("/getAll", PaymentController.getAllPayments);
PaymentRouter.get("/get/:PaymentID", PaymentController.getPayment);
PaymentRouter.delete(
  "/delete/:PaymentID",
  verifyToken,
  PaymentController.deletePayment
);

export default PaymentRouter;
