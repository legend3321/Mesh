import express from "express";
import verifyToken from "../middleware/App.middleware";
import ForecastController from "../controllers/Forecast.controller";

const forecastRouter = express.Router();

forecastRouter.get("/stockout-risk", verifyToken, ForecastController.getStockoutForecast);
forecastRouter.post("/auto-po", verifyToken, ForecastController.executeAutoPurchaseOrders);

export default forecastRouter;
