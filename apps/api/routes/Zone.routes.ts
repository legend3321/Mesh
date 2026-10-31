import express from "express";
import verifyToken from "../middleware/App.middleware";
import ZoneController from "../controllers/Zone.controller";

const zoneRouter = express.Router();

zoneRouter.post("/add", verifyToken, ZoneController.addZone);
zoneRouter.patch("/edit", verifyToken, ZoneController.editZone);
zoneRouter.get("/getAll", verifyToken, ZoneController.getAllZones);
zoneRouter.get("/warehouse/:WarehouseID", verifyToken, ZoneController.getZonesByWarehouse);
zoneRouter.delete("/delete/:ZoneID", verifyToken, ZoneController.deleteZone);

export default zoneRouter;
