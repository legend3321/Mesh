import express from "express";
import verifyToken from "../middleware/App.middleware";
import CustomerController from "../controllers/Customer.controller";
const CustomerRouter = express.Router();

CustomerRouter.post("/add", verifyToken, CustomerController.addCustomer);
CustomerRouter.patch("/edit", verifyToken, CustomerController.editCustomer);
CustomerRouter.get("/getAll", verifyToken, CustomerController.getAllCustomers);
CustomerRouter.get("/get/:CustomerID", verifyToken, CustomerController.getCustomer);
CustomerRouter.delete(
  "/delete/:CustomerID",
  verifyToken,
  CustomerController.deleteCustomer
);

export default CustomerRouter;
