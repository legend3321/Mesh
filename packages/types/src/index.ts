// Role enum matching prisma schema
export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

// Order & Payment status
export type Status = "INITIATED" | "PROCESSING" | "COMPLETED" | "CANCELLED";

// Payment method
export type Mode = "ONLINE" | "OFFLINE" | "CHEQUE";

// Company entity (Multi-Tenancy)
export interface Company {
  companyId: string;
  companyName: string;
  companyCode: string;
  companyDomain?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// User entity
export interface User {
  userId: string;
  userEmail: string;
  userName: string;
  userRole?: Role | null;
  companyId?: string | null;
  company?: Company | null;
}

// Product entity
export interface Product {
  ProductID: string;
  ProductCode: string;
  BarCode: string;
  ProductName: string;
  ProductDescription: string;
  ProductCategory: string;
  ReorderQuantity?: number | null;
  PackedWeight?: number | null;
  PackedHeight?: number | null;
  PackedWidth?: number | null;
  PackedDepth?: number | null;
  Refrigerated?: boolean | null;
  CostPrice: number;
  SellPrice: number;
  MaxretailPrice: number;
  companyId?: string | null;
  company?: Company | null;
}

// Location entity
export interface Location {
  LocationID: string;
  LocationName: string;
  LocationAddress: string;
  companyId?: string | null;
  company?: Company | null;
}

// Warehouse entity
export interface Warehouse {
  WarehouseID: string;
  WarehouseName: string;
  isRefrigerated: boolean;
  LocationID: string;
  Location?: Location;
  companyId?: string | null;
  company?: Company | null;
}

// Inventory entity
export interface Inventory {
  InventoryID: string;
  InventoryAvailable: number;
  MinStockLevel: number;
  MaxStockLevel: number;
  ReorderPoint: number;
  ProductID: string;
  Product?: Product;
  WarehouseID: string;
  Warehouse?: Warehouse;
  companyId?: string | null;
  company?: Company | null;
}

// Customer entity
export interface Customer {
  CustomerID: string;
  CustomerName: string;
  CustomerAddress: string;
  companyId?: string | null;
  company?: Company | null;
}

// Delivery entity
export interface Delivery {
  DeliveryID: string;
  SalesDate: string | Date;
  CustomerID: string;
  Customer?: Customer;
  companyId?: string | null;
  company?: Company | null;
}

// DeliveryDetail entity
export interface DeliveryDetail {
  DeliveryDetailID: string;
  DeliveryQuantity: number;
  ExpectedDate: string | Date;
  ActualDate?: string | Date | null;
  ProductID: string;
  Product?: Product;
  DeliveryID: string;
  Delivery?: Delivery;
}

// Provider entity
export interface Provider {
  ProviderID: string;
  ProviderName: string;
  ProviderAddress: string;
  companyId?: string | null;
  company?: Company | null;
}

// Order entity
export interface Order {
  OrderID: string;
  OrderDate: string | Date;
  ProviderID: string;
  Provider?: Provider;
  companyId?: string | null;
  company?: Company | null;
}

// OrderDetail entity
export interface OrderDetail {
  OrderDetailID: string;
  OrderQuantity: number;
  ExpectedDate: string | Date;
  ActualDate?: string | Date | null;
  ProductIDs: string[];
  OrderID: string;
  Order?: Order;
}

// Transfer entity
export interface Transfer {
  TransferID: string;
  TransferQuantity: number;
  SentDate: string | Date;
  RecievedDate?: string | Date | null;
  ProductID: string;
  Product?: Product;
  OutWarehouseID: string;
  OutWarehouse?: Warehouse;
  InWarehouseID: string;
  InWarehouse?: Warehouse;
  companyId?: string | null;
  company?: Company | null;
}

// Payment entity
export interface Payment {
  PaymentID: string;
  PaymentAmount: number;
  PaymentStatus: Status;
  PaymentMode?: Mode | null;
  PaymentDescription?: string | null;
  OrderID?: string | null;
  Order?: Order | null;
  DeliveryID?: string | null;
  Delivery?: Delivery | null;
  companyId?: string | null;
  company?: Company | null;
}

// Transaction entity
export interface Transaction {
  TransactionID: string;
  TransactionDetail: string;
  UserID: string;
  TransactionOwner?: User;
  companyId?: string | null;
  company?: Company | null;
}

// Auth credentials & payload
export interface LoginCredentials {
  userEmail: string;
  userPassword: string;
}

export interface AuthResponse {
  user: User;
  authToken: string;
}

// Machine Learning Stockout Risk & Forecast Types (XGBoost & Scikit-Learn)
export type RiskLevel = "CRITICAL" | "WARNING" | "SAFE";

export interface StockoutForecastItem {
  inventoryId: string;
  productId: string;
  productCode: string;
  productName: string;
  category: string;
  warehouseId: string;
  warehouseName: string;
  currentStock: number;
  reorderPoint: number;
  minStockLevel: number;
  maxStockLevel: number;
  dailyVelocity: number;
  leadTimeDays: number;
  daysOfCoverage: number;
  stockoutRisk: number; // 0.0 - 1.0 probability
  riskLevel: RiskLevel;
  predictedDaysToStockout: number;
  recommendedReorderQty: number;
  unitCost: number;
  estimatedReplenishmentCost: number;
  preferredProviderId?: string | null;
  preferredProviderName?: string | null;
  featureFactors?: {
    daysOfCoverageWeight?: number;
    leadTimeDemandWeight?: number;
    safetyBufferWeight?: number;
    dailyVelocityWeight?: number;
  };
}

export interface ForecastSummary {
  totalSkusEvaluated: number;
  criticalSkusCount: number;
  warningSkusCount: number;
  safeSkusCount: number;
  projectedStockoutValue: number;
  averageDaysOfCoverage: number;
  modelMetadata: {
    algorithm: string;
    confidenceScore: number;
    topFeatureImportances: Record<string, number>;
    leadTimeAssumedDays: number;
  };
}

export interface ForecastApiResponse {
  status: string;
  items: StockoutForecastItem[];
  summary: ForecastSummary;
}

export interface AutoPOResultItem {
  orderId: string;
  orderDetailId: string;
  productId: string;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  providerId: string;
  providerName: string;
  expectedDate: string;
  stockoutRiskPrior: number;
}

export interface AutoPOResponse {
  success: boolean;
  message: string;
  createdOrdersCount: number;
  totalCapitalCommitted: number;
  orders: AutoPOResultItem[];
}
