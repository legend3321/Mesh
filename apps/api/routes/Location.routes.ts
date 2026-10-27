import express from "express";
import verifyToken from "../middleware/App.middleware";
import LocationController from "../controllers/Location.controller";
const LocationRouter = express.Router();

LocationRouter.post("/add", verifyToken, LocationController.addLocation);
LocationRouter.patch("/edit", verifyToken, LocationController.editLocation);
LocationRouter.get("/getAll", verifyToken, LocationController.getAllLocations);
LocationRouter.get("/get/:LocationID", verifyToken, LocationController.getLocation);
LocationRouter.delete(
  "/delete/:LocationID",
  verifyToken,
  LocationController.deleteLocation
);

export default LocationRouter;
