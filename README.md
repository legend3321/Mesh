# Mesh 📦

A full-stack Supply Chain & Inventory Management Platform built as a high-performance TypeScript monorepo powered by **Turborepo**, **Next.js 14**, and **Express + Prisma**.

---

## 🏗️ Architecture

Mesh is structured as a Turborepo monorepo with decoupled frontend and backend applications sharing types and configuration packages:

```
Mesh/
├── apps/
│   ├── web/                    # Next.js 14 App Router frontend
│   │   ├── app/                # Pages, layouts, API routes & dashboard views
│   │   ├── components/         # Radix UI + Tailwind design system & TanStack tables
│   │   └── assets/             # Axios client configuration
│   └── api/                    # Express + TypeScript backend
│       ├── controllers/        # REST controllers (Product, Inventory, Orders, etc.)
│       ├── routes/             # Express API routes
│       ├── middleware/         # JWT authentication & authorization
│       └── prisma/             # Prisma schema (MongoDB) and faker seed script
├── packages/
│   ├── types/                  # Shared domain types, DTOs & API models (@mesh/types)
│   └── tsconfig/               # Shared tsconfig presets (@mesh/tsconfig)
├── turbo.json                  # Turborepo task pipeline configuration
└── package.json                # Root workspace configuration
```

---

## ⚡ Tech Stack

- **Monorepo Engine**: [Turborepo](https://turbo.build/repo) + npm Workspaces
- **Frontend (`apps/web`)**:
  - Next.js 14 (App Router) & React 18
  - Tailwind CSS & Radix UI (shadcn/ui style components)
  - TanStack React Table v8 (Product catalog, filters, pagination)
  - NextAuth.js (Credentials provider)
- **Backend (`apps/api`)**:
  - Node.js & Express 4 (TypeScript)
  - Prisma ORM 5 with MongoDB
  - JWT authentication & Bcrypt password hashing
- **Shared (`packages/`)**:
  - `@mesh/types`: Shared TypeScript domain models & DTOs
  - `@mesh/tsconfig`: Shared base compiler configurations

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: `v18+` or `v20+` (tested on Node v20/v26)
- **npm**: `v9+` or `v10+`
- **MongoDB**: Local MongoDB instance or MongoDB Atlas cluster URI

### 1. Installation

Clone the repository and install all dependencies across the monorepo:

```bash
git clone https://github.com/legend3321/Mesh.git
cd Mesh
npm install
```

### 2. Environment Variables

#### Backend (`apps/api/.env`)
Create a `.env` file in `apps/api`:

```env
PORT=3001
DATABASE_URL="mongodb+srv://<username>:<password>@cluster0.mongodb.net/mesh?retryWrites=true&w=majority"
SALT="your-jwt-secret-key"
```

#### Frontend (`apps/web/.env.local`)
Create a `.env.local` file in `apps/web` (optional, defaults point to `http://localhost:3001/api`):

```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-nextauth-secret-key"
```

### 3. Database Setup & Seeding

Generate the Prisma Client and seed mock data:

```bash
# Generate Prisma Client
npm run prisma:generate --workspace=@mesh/api

# Seed sample products (using @faker-js/faker)
npm run prisma:seed --workspace=@mesh/api
```

### 4. Running the Development Environment

Start both frontend (`apps/web` on port 3000) and backend (`apps/api` on port 3001) concurrently with Turborepo:

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to view the application.

---

## 🛠️ Monorepo Scripts

All pipeline tasks are orchestrated through Turborepo from the root directory:

| Command | Description |
|---|---|
| `npm run dev` | Runs all applications in parallel with live reload |
| `npm run build` | Builds all packages and apps with Turbo caching |
| `npm run check-types` | Type checks all workspaces (`tsc --noEmit`) in parallel |
| `npm run lint` | Runs linters across all workspaces |
| `npm run clean` | Cleans build artifacts and caches |

---

## 📦 Key Domain Models

- **Product**: SKU, barcode, category, dimensions, pricing, refrigeration requirement.
- **Location & Warehouse**: Multi-warehouse facility mapping.
- **Inventory**: Stock tracking (`MinStockLevel`, `MaxStockLevel`, `ReorderPoint`).
- **Transfer**: Inter-warehouse stock transfers.
- **Order & Provider**: Purchase orders and vendor management.
- **Customer & Delivery**: Sales orders and dispatch scheduling.
- **Payment & Transaction**: Payment verification and audit logging.

---

## 📄 License

ISC
