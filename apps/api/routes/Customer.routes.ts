import express from "express";
import verifyToken from "../middleware/App.middleware";
import CustomerController from "../controllers/Customer.controller";
const CustomerRouter = express.Router();

CustomerRouter.post("/add", verifyToken, CustomerController.addCustomer);
CustomerRouter.patch("/edit", verifyToken, CustomerController.editCustomer);
CustomerRouter.get("/getAll", CustomerController.getAllCustomers);
CustomerRouter.get("/get/:CustomerID", CustomerController.getCustomer);
CustomerRouter.delete(
  "/delete/:CustomerID",
  verifyToken,
  CustomerController.deleteCustomer
);

export default CustomerRouter;
