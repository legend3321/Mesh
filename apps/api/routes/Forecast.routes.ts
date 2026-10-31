import express from "express";
import verifyToken from "../middleware/App.middleware";
import ForecastController from "../controllers/Forecast.controller";
import { forecastLimiter } from "../middleware/RateLimit.middleware";

const forecastRouter = express.Router();

forecastRouter.get("/stockout-risk", verifyToken, ForecastController.getStockoutForecast);

// SEC-10: Rate-limited automated purchase order replenishment
forecastRouter.post(
  "/auto-po",
  verifyToken,
  forecastLimiter,
  ForecastController.executeAutoPurchaseOrders
);

export default forecastRouter;
