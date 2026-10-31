import express from "express";
import verifyToken from "../middleware/App.middleware";
import BinLocationController from "../controllers/BinLocation.controller";

const binLocationRouter = express.Router();

binLocationRouter.post("/add", verifyToken, BinLocationController.addBinLocation);
binLocationRouter.patch("/edit", verifyToken, BinLocationController.editBinLocation);
binLocationRouter.get("/getAll", verifyToken, BinLocationController.getAllBinLocations);
binLocationRouter.get("/warehouse/:WarehouseID", verifyToken, BinLocationController.getBinsByWarehouse);
binLocationRouter.delete("/delete/:BinID", verifyToken, BinLocationController.deleteBinLocation);

export default binLocationRouter;
