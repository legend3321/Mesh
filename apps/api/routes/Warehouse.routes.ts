import express from "express";
import verifyToken from "../middleware/App.middleware";
import WarehouseController from "../controllers/Warehouse.controller";
const WarehouseRouter = express.Router();

WarehouseRouter.post("/add", verifyToken, WarehouseController.addWarehouse);
WarehouseRouter.patch("/edit", verifyToken, WarehouseController.editWarehouse);
WarehouseRouter.get("/getAll", verifyToken, WarehouseController.getAllWarehouses);
WarehouseRouter.get("/get/:WarehouseID", verifyToken, WarehouseController.getWarehouse);
WarehouseRouter.delete(
  "/delete/:WarehouseID",
  verifyToken,
  WarehouseController.deleteWarehouse
);

export default WarehouseRouter;
