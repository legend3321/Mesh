import express from "express";
import verifyToken from "../middleware/App.middleware";
import RMAController from "../controllers/RMA.controller";

const rmaRouter = express.Router();

rmaRouter.post("/add", verifyToken, RMAController.addRMA);
rmaRouter.patch("/edit", verifyToken, RMAController.editRMA);
rmaRouter.get("/getAll", verifyToken, RMAController.getAllRMAs);
rmaRouter.get("/get/:RMAID", verifyToken, RMAController.getSingleRMA);
rmaRouter.delete("/delete/:RMAID", verifyToken, RMAController.deleteRMA);

// Reverse Logistics / Return Intake processing
rmaRouter.post("/process-intake", verifyToken, RMAController.processRMAIntake);

export default rmaRouter;
