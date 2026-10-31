import express from "express";
import verifyToken from "../middleware/App.middleware";
import InventoryController from "../controllers/Inventory.controller";
const InventoryRouter = express.Router();

InventoryRouter.post("/add", verifyToken, InventoryController.addInventory);
InventoryRouter.patch("/edit", verifyToken, InventoryController.editInventory);
InventoryRouter.get("/getAll", verifyToken, InventoryController.getAllInventorys);
InventoryRouter.get("/get/:InventoryID", verifyToken, InventoryController.getInventory);
InventoryRouter.delete(
  "/delete/:InventoryID",
  verifyToken,
  InventoryController.deleteInventory
);
InventoryRouter.post("/fefo-picking", verifyToken, InventoryController.fefoPicking);
InventoryRouter.get("/fefo-picking", verifyToken, InventoryController.fefoPicking);

export default InventoryRouter;
