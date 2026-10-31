import express, { Request, Response } from "express";
import * as dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";

import authRouter from "./routes/Auth.routes";
import productRouter from "./routes/Product.routes";
import LocationRouter from "./routes/Location.routes";
import WarehouseRouter from "./routes/Warehouse.routes";
import InventoryRouter from "./routes/Inventory.routes";
import CustomerRouter from "./routes/Customer.routes";
import DeliveryRouter from "./routes/Delivery.routes";
import DeliveryDetailRouter from "./routes/DeliveryDetail.routes";
import ProviderRouter from "./routes/Provider.routes";
import OrderRouter from "./routes/Order.routes";
import OrderDetailRouter from "./routes/OrderDetail.routes";
import TransferRouter from "./routes/Transfer.routes";
import PaymentRouter from "./routes/Payment.routes";
import TransactionRouter from "./routes/Transaction.routes";
import companyRouter from "./routes/Company.routes";
import companyGroupRouter from "./routes/CompanyGroup.routes";
import superAdminRouter from "./routes/SuperAdmin.routes";
import forecastRouter from "./routes/Forecast.routes";
import ediRouter from "./routes/Edi.routes";
import invoiceRouter from "./routes/Invoice.routes";
import goodsReceiptRouter from "./routes/GoodsReceipt.routes";
import approvalRouter from "./routes/Approval.routes";
import zoneRouter from "./routes/Zone.routes";
import binLocationRouter from "./routes/BinLocation.routes";
import batchRouter from "./routes/Batch.routes";
import rmaRouter from "./routes/RMA.routes";

import { apiLimiter } from "./middleware/RateLimit.middleware";
import { safeErrorHandler } from "./middleware/Error.middleware";
import { validateJwtSecret } from "./config/jwt";
import { prisma } from "./db";
import { DemandForecasterWorker } from "./services/DemandForecasterWorker.service";

dotenv.config();

// SEC-07: Validate JWT cryptographic secret at server startup
validateJwtSecret();

export { prisma };

const port = process.env.PORT || 3001;
const app = express();

// Trust reverse proxies (e.g. Nginx, Docker, Cloudflare) for accurate client IP rate limiting
app.set("trust proxy", 1);

async function main() {
  // SEC-14: Security Headers via Helmet
  app.use(helmet());

  // SEC-14: Restricted CORS Configuration
  const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map((origin) => origin.trim())
    : ["http://localhost:3000", "http://localhost:3001"];

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "x-company-id"],
    })
  );

  app.use(express.json());

  // SEC-10: Global API Rate Limiter
  app.use("/api/", apiLimiter);

  // API Routes
  app.use("/api/auth/", authRouter);
  app.use("/api/company/", companyRouter);
  app.use("/api/company-group/", companyGroupRouter);
  app.use("/api/superadmin/", superAdminRouter);
  app.use("/api/forecast/", forecastRouter);
  app.use("/api/product/", productRouter);
  app.use("/api/location/", LocationRouter);
  app.use("/api/warehouse/", WarehouseRouter);
  app.use("/api/inventory/", InventoryRouter);
  app.use("/api/customer/", CustomerRouter);
  app.use("/api/constumer/", CustomerRouter);
  app.use("/api/delivery/", DeliveryRouter);
  app.use("/api/deliveryDetail/", DeliveryDetailRouter);
  app.use("/api/provider/", ProviderRouter);
  app.use("/api/order/", OrderRouter);
  app.use("/api/orderDetail/", OrderDetailRouter);
  app.use("/api/transfer/", TransferRouter);
  app.use("/api/payment/", PaymentRouter);
  app.use("/api/transaction/", TransactionRouter);
  app.use("/api/edi/", ediRouter);
  app.use("/api/invoice/", invoiceRouter);
  app.use("/api/goodsReceipt/", goodsReceiptRouter);
  app.use("/api/goods-receipt/", goodsReceiptRouter);
  app.use("/api/approval/", approvalRouter);
  app.use("/api/zone/", zoneRouter);
  app.use("/api/bin-location/", binLocationRouter);
  app.use("/api/batch/", batchRouter);
  app.use("/api/rma/", rmaRouter);

  // Catch unregistered routes
  app.all("*", (req: Request, res: Response) => {
    res.status(404).json({ error: `Route ${req.originalUrl} not found` });
  });

  // SEC-13: Centralized Safe Error Handling Middleware
  app.use(safeErrorHandler);

  app.listen(port, () => {
    console.log(`Server started on ${port}`);
  });
}

main()
  .then(async () => {
    await prisma.$connect();
    DemandForecasterWorker.startBackgroundWorker();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
