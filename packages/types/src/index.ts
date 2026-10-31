// Role enum matching prisma schema
export type Role = "SUPERADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE";

export type Status = "INITIATED" | "PROCESSING" | "COMPLETED" | "CANCELLED" | "PENDING_APPROVAL";

// Payment method
export type Mode = "ONLINE" | "OFFLINE" | "CHEQUE";

export type MatchStatus =
  | "MATCH_PENDING"
  | "MATCHED"
  | "MATCH_CLEARED"
  | "MATCH_VARIANCE_HOLD"
  | "MISMATCHED"
  | "PRICE_MISMATCH"
  | "QUANTITY_MISMATCH"
  | "DISCREPANCY"
  | "MANUALLY_APPROVED";

export type ApprovalStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "CANCELLED";

export type InspectionStatus =
  | "PASSED"
  | "FAILED"
  | "PARTIALLY_PASSED"
  | "PENDING_INSPECTION";

export type ItemDisposition =
  | "ACCEPTED"
  | "REJECTED"
  | "RETURNED"
  | "QUARANTINED";

// GoodsReceipt entity (3-Way Matching Component)
export interface GoodsReceipt {
  GoodsReceiptID: string;
  OrderID: string;
  Order?: Order;
  WarehouseID?: string | null;
  Warehouse?: Warehouse | null;
  ReceivedDate: string | Date;
  InspectionStatus: InspectionStatus | string;
  ReceivedBy?: string | null;
  companyId?: string | null;
  company?: Company | null;
  items?: GoodsReceiptItem[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// GoodsReceiptItem entity
export interface GoodsReceiptItem {
  GoodsReceiptItemID: string;
  GoodsReceiptID: string;
  GoodsReceipt?: GoodsReceipt;
  ProductID: string;
  Product?: Product;
  QuantityOrdered: number;
  QuantityReceived: number;
  QuantityDamaged: number;
  Disposition?: ItemDisposition | string | null;
}

// VendorInvoice entity (3-Way Matching Component)
export interface VendorInvoice {
  InvoiceID: string;
  OrderID?: string | null;
  Order?: Order | null;
  ProviderID?: string | null;
  Provider?: Provider | null;
  InvoiceNumber: string;
  InvoiceDate: string | Date;
  DueDate?: string | Date | null;
  Subtotal: number;
  Tax: number;
  TotalAmount: number;
  MatchStatus: MatchStatus | string;
  MatchNotes?: string | null;
  companyId?: string | null;
  company?: Company | null;
  items?: InvoiceItem[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// InvoiceItem entity
export interface InvoiceItem {
  InvoiceItemID: string;
  InvoiceID: string;
  VendorInvoice?: VendorInvoice;
  ProductID: string;
  Product?: Product;
  QuantityBilled: number;
  UnitPrice: number;
  LineTotal: number;
}

// ApprovalQueue entity (Maker-Checker Dual Control & Governance)
export interface ApprovalQueue {
  ApprovalID: string;
  EntityType: "ORDER" | "PAYMENT" | "INVOICE" | string;
  EntityID: string;
  RequestedAmount: number;
  Status: ApprovalStatus | string;
  RequestedBy: string;
  ApprovedBy?: string | null;
  ApprovalNotes?: string | null;
  companyId?: string | null;
  company?: Company | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// Input DTOs
export interface CreateGoodsReceiptItemDto {
  ProductID: string;
  QuantityOrdered: number;
  QuantityReceived: number;
  QuantityDamaged?: number;
  Disposition?: ItemDisposition | string;
}

export interface CreateGoodsReceiptDto {
  OrderID: string;
  WarehouseID?: string | null;
  ReceivedDate?: string | Date;
  InspectionStatus?: InspectionStatus | string;
  ReceivedBy?: string | null;
  items: CreateGoodsReceiptItemDto[];
}

export interface CreateInvoiceItemDto {
  ProductID: string;
  QuantityBilled: number;
  UnitPrice: number;
  LineTotal: number;
}

export interface CreateVendorInvoiceDto {
  OrderID?: string | null;
  ProviderID?: string | null;
  InvoiceNumber: string;
  InvoiceDate?: string | Date;
  DueDate?: string | Date | null;
  Subtotal: number;
  Tax?: number;
  TotalAmount: number;
  MatchStatus?: MatchStatus | string;
  MatchNotes?: string | null;
  items: CreateInvoiceItemDto[];
}

export interface CreateApprovalQueueDto {
  EntityType: "INVOICE" | "ORDER" | "PAYMENT" | string;
  EntityID: string;
  RequestedAmount: number;
  RequestedBy: string;
  ApprovalNotes?: string | null;
}

export interface ResolveApprovalDto {
  ApprovalID?: string;
  Status: "APPROVED" | "REJECTED";
  ApprovedBy?: string;
  ApprovalNotes?: string | null;
}

export interface ThreeWayMatchLineResult {
  productId: string;
  productName?: string;
  productCode?: string;
  quantityOrdered: number;
  quantityReceived: number;
  quantityBilled: number;
  unitPriceOrdered?: number;
  unitPriceBilled: number;
  lineTotalBilled: number;
  quantityMatched: boolean;
  priceMatched: boolean;
  discrepancies: string[];
}

export interface ThreeWayMatchResult {
  invoiceId: string;
  orderId?: string | null;
  overallStatus: MatchStatus;
  matched: boolean;
  totalVariance: number;
  priceVariance: number;
  quantityVariance: number;
  lineResults: ThreeWayMatchLineResult[];
  requiresApproval: boolean;
  notes?: string | null;
}

// Group of Companies entity (Multi-Tenancy Umbrella / Conglomerate)
export interface CompanyGroup {
  companyGroupId: string;
  groupName: string;
  groupCode: string;
  description?: string | null;
  logoUrl?: string | null;
  industry?: string | null;
  country?: string | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  companies?: Company[];
  users?: User[];
  _count?: {
    companies?: number;
    users?: number;
  };
}

// Company entity (Multi-Tenancy)
export interface Company {
  companyId: string;
  companyName: string;
  companyCode: string;
  companyDomain?: string | null;
  logoUrl?: string | null;
  description?: string | null;
  companyGroupId?: string | null;
  companyGroup?: CompanyGroup | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
  zones?: Zone[];
  binLocations?: BinLocation[];
  batches?: Batch[];
  rmas?: RMA[];
  _count?: {
    users?: number;
    products?: number;
    warehouses?: number;
    orders?: number;
    deliveries?: number;
  };
}

// User entity
export interface User {
  userId: string;
  userEmail: string;
  userName: string;
  userRole?: Role | null;
  companyId?: string | null;
  company?: Company | null;
  companyGroupId?: string | null;
  companyGroup?: CompanyGroup | null;
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
  batches?: Batch[];
  RMADetails?: RMADetail[];
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
  zones?: Zone[];
  binLocations?: BinLocation[];
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
  BinID?: string | null;
  BinLocation?: BinLocation | null;
  BatchID?: string | null;
  Batch?: Batch | null;
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
  RMAs?: RMA[];
}

// Delivery entity
export interface Delivery {
  DeliveryID: string;
  SalesDate: string | Date;
  CustomerID: string;
  Customer?: Customer;
  WarehouseID?: string | null;
  Warehouse?: Warehouse | null;
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
  Status?: Status | string | null;
  OrderStatus?: Status | string | null;
  TotalNet?: number | null;
  TotalTax?: number | null;
  TotalAmount?: number | null;
  CreatedBy?: string | null;
  ProviderID: string;
  Provider?: Provider;
  companyId?: string | null;
  company?: Company | null;
  Orderdetail?: OrderDetail[];
  Payments?: Payment[];
  GoodsReceipts?: GoodsReceipt[];
  VendorInvoices?: VendorInvoice[];
  RMAs?: RMA[];
}

// OrderDetail entity
export interface OrderDetail {
  OrderDetailID: string;
  OrderQuantity: number;
  UnitPrice?: number | null;
  TaxRate?: number | null;
  LineTotal?: number | null;
  ExpectedDate: string | Date;
  ActualDate?: string | Date | null;
  ProductID?: string;
  ProductIDs: string[];
  Products?: Product | null;
  OrderID: string;
  Order?: Order;
}

// Transfer entity
export interface Transfer {
  TransferID: string;
  TransferQuantity: number;
  SentDate: string | Date;
  RecievedDate?: string | Date | null;
  TransferStatus?: string | null;
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
  CreatedBy?: string | null;
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

// ==========================================
// Warehouse Management System (WMS) Types
// ==========================================

export type ZoneType = "BULK" | "HIGH_BAY" | "COLD_CHAIN" | "PICK_PACK";

export interface Zone {
  ZoneID: string;
  ZoneName: string;
  ZoneType: ZoneType;
  WarehouseID: string;
  Warehouse?: Warehouse;
  companyId?: string | null;
  company?: Company | null;
  BinLocations?: BinLocation[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface BinLocation {
  BinID: string;
  BinCode: string;
  Aisle: string;
  Rack: string;
  Shelf: string;
  Bin: string;
  MaxWeightKg?: number | null;
  MaxVolumeCbm?: number | null;
  ZoneID: string;
  Zone?: Zone;
  WarehouseID: string;
  Warehouse?: Warehouse;
  companyId?: string | null;
  company?: Company | null;
  Inventory?: Inventory[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface Batch {
  BatchID: string;
  BatchNumber: string;
  ProductID: string;
  Product?: Product;
  ManufacturingDate: string | Date;
  ExpiryDate: string | Date;
  SupplierLotNumber?: string | null;
  QualityStatus: string;
  companyId?: string | null;
  company?: Company | null;
  Inventory?: Inventory[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export type RMAStatus = "REQUESTED" | "RECEIVED" | "INSPECTED" | "SETTLED";

export type RMADisposition = "RESTOCK" | "REWORK" | "SCRAP" | "QUARANTINE";

export interface RMA {
  RMAID: string;
  RMANumber: string;
  CustomerID: string;
  Customer?: Customer;
  OrderID?: string | null;
  Order?: Order | null;
  Reason: string;
  Status: RMAStatus;
  companyId?: string | null;
  company?: Company | null;
  RMADetails?: RMADetail[];
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface RMADetail {
  RMADetailID: string;
  RMAID: string;
  RMA?: RMA;
  ProductID: string;
  Product?: Product;
  QuantityReturned: number;
  Disposition?: RMADisposition | null;
  CreditAmount?: number | null;
  WarehouseID?: string | null;
  Warehouse?: Warehouse | null;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

// FEFO Picking Suggestion Types
export interface FefoPickingRequest {
  productId: string;
  requestedQuantity: number;
  warehouseId?: string;
}

export interface FefoPickingAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: string | Date;
  manufacturingDate: string | Date;
  inventoryId: string;
  warehouseId: string;
  warehouseName?: string;
  binId?: string | null;
  binCode?: string | null;
  aisle?: string | null;
  rack?: string | null;
  shelf?: string | null;
  bin?: string | null;
  zoneName?: string | null;
  allocatedQuantity: number;
  availableStockInBatch: number;
}

export interface FefoPickingResponse {
  productId: string;
  productName: string;
  productCode: string;
  requestedQuantity: number;
  totalAllocatedQuantity: number;
  remainingUnfulfilledQuantity: number;
  fullyAllocated: boolean;
  allocations: FefoPickingAllocation[];
  warnings: string[];
  expiredStockFound?: {
    batchId: string;
    batchNumber: string;
    expiryDate: string | Date;
    quantity: number;
    warehouseId: string;
    binCode?: string | null;
  }[];
}

// Reverse Logistics / RMA Intake Types
export interface RmaIntakeItem {
  rmaDetailId?: string;
  productId: string;
  quantity: number;
  disposition: RMADisposition;
  warehouseId: string;
  binId?: string | null;
  creditAmount?: number;
  notes?: string;
}

export interface RmaIntakeRequest {
  rmaId: string;
  status?: RMAStatus;
  items: RmaIntakeItem[];
  intakeNotes?: string;
}

export interface RmaIntakeResponse {
  success: boolean;
  message: string;
  rma: RMA;
  totalCreditIssued: number;
  restockedItemsCount: number;
  quarantinedItemsCount: number;
  scrappedItemsCount: number;
  reworkedItemsCount: number;
}

