# Mesh 📦

> **Enterprise B2B Multi-Tenant Supply Chain & Inventory Management Platform** powered by **Machine Learning (XGBoost & Scikit-Learn)** for predictive stockout risk forecasting and autonomous purchase order procurement.

Built as a high-performance TypeScript monorepo with **Turborepo**, **Next.js 14 (App Router)**, **Express**, and **Prisma ORM (MongoDB)**.

---

## 🌟 Key Features

### 1. 🤖 Machine Learning Stockout Forecaster & Auto-PO
- **XGBoost + Scikit-Learn Predictive Ensemble**:
  - Leverages `xgboost.XGBClassifier` coupled with `sklearn.ensemble.RandomForestClassifier` and `StandardScaler` to evaluate stockout risks across supply depots.
  - Predicts continuous stockout risk probabilities ($0.0\% - 100.0\%$), days of runway remaining before depletion, and optimal replenishment batches.
- **Engineered Supply-Chain Features**:
  1. **Days of Coverage ($DOC$)**: $\frac{\text{Current Available Stock}}{\max(\text{Daily Demand Velocity}, 0.5)}$
  2. **Safety Buffer Ratio**: $\frac{\text{Available Stock} - \text{Min Stock Level}}{\text{Reorder Point}}$
  3. **Lead Time Demand ($LTD$)**: $\text{Daily Velocity} \times \text{Vendor Lead Days}$
  4. **Daily Demand Velocity**: 30-day trailing sales & customer dispatch run rates.
  5. **Reorder Deficit**: Positive inventory shortfall below reorder threshold.
  6. **Current Stock Level**: Raw warehouse inventory count.
- **Explainability & Attribution**:
  - Computes and visualizes normalized feature importance weights from XGBoost, providing supply-chain planners with clear insight into risk drivers.
- **Autonomous Purchase Order Procurement**:
  - **1-Click & Batch Auto-PO Triggers**: Automatically provisions purchase orders for critical items.
  - **Full Ledger Integrity**: Transactionally creates `Order` (status `ORDERED` with estimated arrival date), `OrderDetail` (EOQ / batch sizing), `Payment` (status `PROCESSING`), and immutable audit `Transaction` logs.

### 2. 🏢 B2B Multi-Tenancy Architecture
- **Strict Tenant Isolation**:
  - Data across all supply-chain entities is isolated by `CompanyID` (`Apex Logistics Corp`, `Starlight Global Retail`, etc.).
  - Tenant scope is passed via the `x-company-id` header and managed globally via `CompanyContext` and a header switcher.
- **Tenant Management**:
  - Administrative portal (`/dashboard/companies`) for managing corporate entities, domains, and configurations.

### 3. 🛡️ Role-Based Access Control (RBAC)
- Multi-tier enterprise authorization:
  - **`ADMIN`**: Full platform oversight, user management, company switching, catalog configuration, and replenishment approvals.
  - **`MANAGER`**: Operational management across warehouse depots, orders, transfers, and inventory.
  - **`EMPLOYEE`**: View-only and operational logging of daily dispatches and stock audits.
- Administrative User & RBAC Management console (`/dashboard/users`).

### 4. 📊 Executive Command Center & Telemetry
- **Interactive Visualizations (Recharts)**:
  - **Throughput & Fulfillment**: Area chart comparing inbound PO procurements with outbound customer delivery dispatches.
  - **Catalog Category Mix**: Donut chart detailing SKU distribution across verticals.
  - **Depot Balance & Capacity**: Bar chart showing unit volume distribution per facility.
  - **Cashflow & Settlement Pipeline**: Multi-state settlement chart tracking accounts payable/receivable.
- **Real-Time Telemetry Cards**:
  - Total Stock Units, Reorder Alerts, Settled Volume, and Active Inter-Depot Transfers.
  - Quick-access operational shortcuts and high-visibility ML Forecaster banner.

### 5. 📑 Universal CRUD Suite & Deep Interlinking
- Standardized UI architecture powered by reusable `GenericEntityTable`, slide-over `GenericEntityDrawer`, and `GenericEntityModal`.
- Comprehensive CRUD ledgers with bidirectional navigation:
  - **Products**, **Locations**, **Warehouses**, **Inventories**, **Customers**, **Deliveries**, **Providers**, **Orders**, **Transfers**, **Payments**, **Transactions**, **Companies**, and **Users**.
- Seamless cross-entity linking (e.g., jump from low inventory directly to SKU specifications, depot details, active transfers, or the ML forecaster).

### 6. 🎨 Ergonomic & Modern UI/UX
- **Adaptive Sidebar**: Smooth desktop collapsing into clean icon-only mode with floating tooltips and mobile hamburger drawer.
- **Custom Brand Identity**: Native SVG vectors (`MeshLogoSvg`).
- **Redesigned Enterprise Auth**: Dual-panel login screen featuring one-click demo credentials and multi-tenant branding.

---

## 🏗️ Monorepo Architecture

```
Mesh/
├── apps/
│   ├── web/                         # Next.js 14 App Router frontend
│   │   ├── app/
│   │   │   ├── (routes)/
│   │   │   │   ├── dashboard/       # Enterprise command center
│   │   │   │   │   ├── forecast/    # ML Stockout Forecaster & Auto-PO dashboard
│   │   │   │   │   ├── companies/   # Multi-tenant corporate management
│   │   │   │   │   ├── users/       # User accounts & RBAC management
│   │   │   │   │   ├── inventory/   # Stock ledgers & reorder thresholds
│   │   │   │   │   ├── product/     # Master SKU catalog & specifications
│   │   │   │   │   ├── warehouse/   # Depots & storage facility nodes
│   │   │   │   │   └── ...          # Order, Transfer, Delivery, Payment, etc.
│   │   │   │   └── login/           # Enterprise authentication portal
│   │   │   ├── components/          # Reusable UI, Sidenav, Modals & Drawers
│   │   │   └── assets/api.ts        # Axios client with multi-tenant interceptors
│   │   └── components/ui/           # Radix UI + Tailwind design tokens
│   │
│   └── api/                         # Express + TypeScript backend
│       ├── controllers/             # REST controllers (Forecast, Company, Product, etc.)
│       ├── routes/                  # Express API routers
│       ├── services/                # ML Python bridge & business services
│       ├── ml/                      # Native Python ML Engine (forecast_engine.py)
│       ├── middleware/              # JWT auth, RBAC & multi-tenant tenancy resolution
│       └── prisma/                  # MongoDB schema & multi-tenant seed script
│
├── packages/
│   ├── types/                       # Shared domain models & ML DTOs (@mesh/types)
│   └── tsconfig/                    # Shared TypeScript configs (@mesh/tsconfig)
│
├── turbo.json                       # Turborepo task pipelines & cache rules
└── package.json                     # Root npm workspace definitions
```

---

## ⚡ Tech Stack

| Layer | Technologies |
|---|---|
| **Monorepo Engine** | [Turborepo](https://turbo.build/repo) + npm Workspaces |
| **Frontend** | Next.js 14 (App Router), React 18, Tailwind CSS, Recharts, Lucide Icons |
| **Authentication** | NextAuth.js (Credentials Provider), JWT session management |
| **Backend API** | Node.js, Express 4, TypeScript |
| **Database & ORM** | MongoDB (Replica Set supported), Prisma ORM 5 |
| **Machine Learning** | Python 3, XGBoost (`XGBClassifier`), Scikit-Learn, NumPy, OpenMP |
| **Shared Packages** | `@mesh/types` (Type definitions & DTOs), `@mesh/tsconfig` |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18+` or `v20+`
- **npm**: `v9+` or `v10+`
- **MongoDB**: Local replica set or MongoDB Atlas URI
- **Python**: `v3.10+` (with `xgboost`, `scikit-learn`, `numpy`)
  - *macOS note*: If running XGBoost on Apple Silicon, install `libomp` via Homebrew:
    ```bash
    brew install libomp
    ```

### 1. Installation

Clone the repository and install all dependencies:

```bash
git clone https://github.com/legend3321/Mesh.git
cd Mesh
npm install
```

Install Python machine learning dependencies:

```bash
pip3 install xgboost scikit-learn numpy
```

### 2. Environment Variables

#### Backend (`apps/api/.env`)
```env
PORT=3001
DATABASE_URL="mongodb://localhost:27017/mesh?replicaSet=rs0"
SALT="super-secret-jwt-salt"
```

#### Frontend (`apps/web/.env.local`)
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="super-secret-nextauth-token"
```

### 3. Database Setup & Seeding

Generate the Prisma Client and seed realistic multi-tenant data with low-stock test items:

```bash
# Generate Prisma Client
npm run prisma:generate --workspace=@mesh/api

# Seed companies, users, catalog, and inventory
npm run prisma:seed --workspace=@mesh/api
```

### 4. Running the Development Server

Start both the Next.js frontend (port `3000`) and Express API (port `3001`) concurrently:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to open the application.

---

## 🔑 Demo Accounts

Use any of the seeded credentials below on the [Login page](http://localhost:3000/login):

| Email | Password | Role | Assigned Company |
|---|---|---|---|
| `admin@mesh.com` | `admin123` | `ADMIN` | Apex Logistics Corp |
| `starlight.admin@mesh.com` | `admin123` | `ADMIN` | Starlight Global Retail |
| `manager@mesh.com` | `manager123` | `MANAGER` | Apex Logistics Corp |
| `employee@mesh.com` | `employee123` | `EMPLOYEE` | Apex Logistics Corp |

---

## 🧠 ML Forecasting & Auto-PO Workflow

1. Navigate to **AI Forecaster** (`/dashboard/forecast`) from the sidebar or click **"Launch Forecaster"** from the Overview page.
2. The system executes `forecast_engine.py` using live multi-tenant inventory metrics.
3. Review the **XGBoost Feature Importance** bar chart to see what variables are driving stockout risks.
4. Filter by **Critical Risk (< 7 days)** or inspect individual SKUs in the drawer.
5. Click **"⚡ Auto-PO"** on any item or **"🚀 Execute AI Auto-PO (All Critical)"** to autonomously create procurement orders, payment invoices, and audit transaction records in the ledger.

---

## 🛠️ Monorepo Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts all applications in parallel with live reload |
| `npm run build` | Builds all packages and apps with Turborepo caching |
| `npm run check-types` | Executes TypeScript type-checks (`tsc --noEmit`) across all workspaces |
| `npm run lint` | Runs ESLint across workspaces |
| `npm run clean` | Cleans build artifacts and caches |

---

## 📄 License

ISC
