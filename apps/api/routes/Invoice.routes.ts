import express from "express";
import verifyToken from "../middleware/App.middleware";
import InvoiceController from "../controllers/Invoice.controller";

const invoiceRouter = express.Router();

invoiceRouter.post("/match/:InvoiceID", verifyToken, InvoiceController.matchInvoice);
invoiceRouter.get("/getAll", verifyToken, InvoiceController.getAllInvoices);
invoiceRouter.get("/:InvoiceID", verifyToken, InvoiceController.getInvoice);
invoiceRouter.post("/add", verifyToken, InvoiceController.addInvoice);

export default invoiceRouter;
