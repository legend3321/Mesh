import express from "express";
import verifyToken from "../middleware/App.middleware";
import ProviderController from "../controllers/Provider.controller";
const ProviderRouter = express.Router();

ProviderRouter.post("/add", verifyToken, ProviderController.addProvider);
ProviderRouter.patch("/edit", verifyToken, ProviderController.editProvider);
ProviderRouter.get("/getAll", ProviderController.getAllProviders);
ProviderRouter.get("/get/:ProviderID", ProviderController.getProvider);
ProviderRouter.delete(
  "/delete/:ProviderID",
  verifyToken,
  ProviderController.deleteProvider
);

export default ProviderRouter;
