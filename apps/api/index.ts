import express, { Request, Response } from "express";
import authRouter from "./routes/Auth.routes";
import * as dotenv from "dotenv";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
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

dotenv.config();

export const prisma = new PrismaClient();

const port = process.env.PORT || 3001;
const app = express();

async function main() {
  app.use(express.json());
  app.use(cors());
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

  // Catch unregistered routes
  app.all("*", (req: Request, res: Response) => {
    res.status(404).json({ error: `Route ${req.originalUrl} not found` });
  });
  app.listen(port, () => {
    console.log(`Server started on ${port}`);
  });
}

main()
  .then(async () => {
    await prisma.$connect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
