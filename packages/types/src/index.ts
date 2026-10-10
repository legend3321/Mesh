// Role enum matching prisma schema
export type Role = "ADMIN" | "MANAGER" | "EMPLOYEE";

// Order & Payment status
export type Status = "INITIATED" | "PROCESSING" | "COMPLETED" | "CANCELLED";

// Payment method
export type Mode = "ONLINE" | "OFFLINE" | "CHEQUE";

// User entity
export interface User {
  userId: string;
  userEmail: string;
  userName: string;
  userRole?: Role | null;
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
}

// Location entity
export interface Location {
  LocationID: string;
  LocationName: string;
  LocationAddress: string;
}

// Warehouse entity
export interface Warehouse {
  WarehouseID: string;
  WarehouseName: string;
  isRefrigerated: boolean;
  LocationID: string;
  Location?: Location;
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
}

// Customer entity
export interface Customer {
  CustomerID: string;
  CustomerName: string;
  CustomerAddress: string;
}

// Delivery entity
export interface Delivery {
  DeliveryID: string;
  SalesDate: string | Date;
  CustomerID: string;
  Customer?: Customer;
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
}

// Order entity
export interface Order {
  OrderID: string;
  OrderDate: string | Date;
  ProviderID: string;
  Provider?: Provider;
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
}

// Transaction entity
export interface Transaction {
  TransactionID: string;
  TransactionDetail: string;
  UserID: string;
  TransactionOwner?: User;
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
