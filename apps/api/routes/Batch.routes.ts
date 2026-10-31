import express from "express";
import verifyToken from "../middleware/App.middleware";
import BatchController from "../controllers/Batch.controller";

const batchRouter = express.Router();

batchRouter.post("/add", verifyToken, BatchController.addBatch);
batchRouter.patch("/edit", verifyToken, BatchController.editBatch);
batchRouter.get("/getAll", verifyToken, BatchController.getAllBatches);
batchRouter.get("/product/:ProductID", verifyToken, BatchController.getBatchesByProduct);
batchRouter.delete("/delete/:BatchID", verifyToken, BatchController.deleteBatch);

// FEFO Picking Suggestion Endpoint
batchRouter.post("/fefo-picking", verifyToken, BatchController.getFefoPickingPlan);
batchRouter.get("/fefo-picking", verifyToken, BatchController.getFefoPickingPlan);

export default batchRouter;
