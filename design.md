# Mesh Design System & UI Specifications

This document defines the design tokens, layout hierarchy, component standards, and user experience specifications for the **Mesh Supply Chain & Inventory Management Platform**.

---

## 1. Visual Identity & Brand Foundations

### 1.1 Brand Philosophy
Mesh is designed for logistics operators, warehouse managers, and supply chain administrators. The visual language emphasizes **clarity, high information density, structural hierarchy, and rapid scanability**.

- **Personality**: Reliable, industrial-grade, efficient, clean, data-focused.
- **Design Metaphor**: Structured grid and physical spatial arrangement (warehouses, slots, pallets, movements).

### 1.2 Color Palette

#### Primary & Brand Palette
| Token | Hex / HSL | Usage |
|---|---|---|
| `meshBlue` | `#0f172a` (Slate 900) | Primary brand tone, main sidebar, prominent headers |
| `primary` | `hsl(222.2, 47.4%, 11.2%)` | Primary action buttons, active states, key emphasis |
| `primary-foreground`| `hsl(210, 40%, 98%)` | Text on primary elements |

#### Neutral & Background Palette
| Token | Hex / HSL | Usage |
|---|---|---|
| `background` | `hsl(0, 0%, 100%)` / `#f8fafc` | Main workspace background, canvas surfaces |
| `card` / Surface | `hsl(0, 0%, 100%)` | Content cards, data tables, modal dialogs |
| `border` | `hsl(214.3, 31.8%, 91.4%)` / `#e2e8f0` | Dividers, table borders, input outlines |
| `muted` | `hsl(210, 40%, 96.1%)` / `#f1f5f9` | Table header strips, pill backgrounds, disabled states |
| `foreground` | `hsl(222.2, 84%, 4.9%)` / `#0f172a` | High-contrast body text, headings |
| `muted-foreground` | `hsl(215.4, 16.3%, 46.9%)` / `#64748b`| Secondary captions, helper hints, timestamps |

#### Operational & Semantic Status Colors
| State | Light Mode Tint | Foreground | Usage |
|---|---|---|---|
| **Success / Completed** | `#ecfdf5` (Emerald 50) | `#059669` (Emerald 600) | Completed deliveries, orders fulfilled, healthy stock |
| **Warning / Low Stock** | `#fffbeb` (Amber 50) | `#d97706` (Amber 600) | Reorder point reached, pending approval |
| **Destructive / Error** | `#fef2f2` (Red 50) | `#dc2626` (Red 600) | Out of stock, cancelled orders, destructive actions |
| **In Transit / Active** | `#eff6ff` (Blue 50) | `#2563eb` (Blue 600) | Inter-warehouse transfers, dispatches in transit |

---

## 2. Typography

- **Primary Font Family**: Inter, system-ui, `-apple-system`, `sans-serif`
- **Monospace Font**: JetBrains Mono, Fira Code, `ui-monospace` (used for Barcodes, SKUs, Tracking IDs, and Hex ObjectIDs)

### Type Scale
| Role | Size | Weight | Line Height | Tracking |
|---|---|---|---|---|
| Display / Brand | `30px` (`text-3xl`) | Bold (`700`) | `36px` | `-0.02em` |
| Page Title (`H1`) | `24px` (`text-2xl`) | SemiBold (`600`) | `32px` | `-0.015em` |
| Section Title (`H2`) | `20px` (`text-xl`) | SemiBold (`600`) | `28px` | `-0.01em` |
| Subheading (`H3`) | `16px` (`text-base`) | Medium (`500`) | `24px` | normal |
| Body Default | `14px` (`text-sm`) | Regular (`400`) | `20px` | normal |
| Data Tables / Metadata | `13px` (`text-[13px]`) | Regular / Medium | `18px` | normal |
| Small / Captions | `12px` (`text-xs`) | Regular / Medium | `16px` | `0.01em` |

---

## 3. Spatial System & Elevation

### 3.1 Spacing Scale
Built on the standard 4px / 8px grid:
- `space-1` = `4px`
- `space-2` = `8px`
- `space-3` = `12px`
- `space-4` = `16px`
- `space-6` = `24px`
- `space-8` = `32px`

### 3.2 Border Radii
- **Input / Button / Badge**: `calc(var(--radius) - 2px)` = `6px` (`rounded-md`)
- **Card / Dialog / Table Container**: `var(--radius)` = `8px` (`rounded-lg`)
- **Pill / Status Tag**: `9999px` (`rounded-full`)

### 3.3 Elevation & Shadows
- **Card / Table Surface**: `shadow-sm` (`0 1px 2px 0 rgb(0 0 0 / 0.05)`)
- **Dropdown / Popover**: `shadow-md` (`0 4px 6px -1px rgb(0 0 0 / 0.1)`)
- **Modal Dialog**: `shadow-xl` (`0 20px 25px -5px rgb(0 0 0 / 0.1)`)

---

## 4. Layout Architecture

### 4.1 Shell Layout
The authenticated workspace uses a persistent responsive two-column dashboard layout:

```
┌─────────────────┬──────────────────────────────────────────────────────────────────┐
│                 │ Navbar (Breadcrumbs, Facility Switcher, Notifications, User)     │
│  Sidenav (256px)├──────────────────────────────────────────────────────────────────┤
│                 │ Page Header (Title, Summary Metrics, Action Buttons)             │
│  - Logo & Brand │                                                                  │
│  - Navigation   │ Content Area                                                     │
│    Items with   │ ┌──────────────────────────────────────────────────────────────┐ │
│    Lucide icons │ │ Filter Bar (Search, Category, Warehouse, Export)             │ │
│                 │ ├──────────────────────────────────────────────────────────────┤ │
│  - User Profile │ │ TanStack Data Table / Cards View                             │ │
│  - Sign Out     │ └──────────────────────────────────────────────────────────────┘ │
│                 │ Pagination & Selection Summary Footer                            │
└─────────────────┴──────────────────────────────────────────────────────────────────┘
```

- **Sidebar (`w-64`)**: Fixed dark theme (`bg-meshBlue`, `#0f172a`), scrollable navigation items with active indicators. Collapsible on mobile viewports.
- **Main Canvas**: Fluid width (`bg-slate-50`), structured padding (`p-6` to `p-8`), max content width constraint (`max-w-7xl`).

---

## 5. Component Design Standards

### 5.1 Buttons
- **Primary**: Solid dark slate (`bg-slate-900 text-white hover:bg-slate-800`), used for single primary page actions (e.g., "Add Product", "Create Transfer").
- **Secondary / Outline**: Bordered with muted text (`border-input bg-background hover:bg-accent`), used for Import/Export, Filter, and secondary workflows.
- **Destructive**: Soft red or solid red (`bg-destructive text-destructive-foreground`), reserved for deletions or order cancellations.
- **Icon Buttons**: Uniform `h-8 w-8` or `h-9 w-9` squares with centered Lucide icons.

### 5.2 Data Tables (Core Pattern)
Data tables are the central interaction surface in Mesh.
- **Header**: Subtle grey background (`bg-muted/50`), uppercase or title-case medium text with column sorting indicators (`ArrowUpDown`).
- **Rows**: Alternating or clean bordered rows (`hover:bg-slate-50/80`), `h-12` vertical padding for touch & desktop density balance.
- **Code Identifiers**: Monospace badges for SKUs, Barcodes, and IDs.
- **Toolbar**: Live search input (`max-w-sm`), multi-column visibility dropdown, batch selection actions.
- **Footer**: Selected rows counter (`x of y rows selected`) paired with accessible Previous / Next page controls.

### 5.3 Status Pills / Badges
Compact semantic tags displaying record state:
- `INITIATED`: Neutral slate pill with subtle border.
- `PROCESSING` / `IN_TRANSIT`: Blue tint with pulsing dot indicator.
- `COMPLETED`: Emerald tint with check icon.
- `CANCELLED`: Red tint with muted cross icon.

### 5.4 Form Controls & Inputs
- Standard height: `36px` (`h-9`) for compact density or `40px` (`h-10`) for standard dialogs.
- Clear validation messages using Zod + React Hook Form with red helper text (`text-destructive text-xs`).
- Distinct focus ring (`ring-2 ring-slate-950 ring-offset-2`).

---

## 6. Accessibility & Responsiveness

- **Contrast Compliance**: All text and icon elements satisfy WCAG AA ratio (minimum 4.5:1 for normal text).
- **Keyboard Navigation**: Native tab ordering, focus-visible indicators across all dropdowns, inputs, and table headers.
- **Breakpoints**:
  - `Mobile (< 640px)`: Drawer sidebar, stacked filter bars, horizontal table scrolling.
  - `Tablet (640px - 1024px)`: Compact sidebar, 2-column metric cards.
  - `Desktop (> 1024px)`: Expanded sidebar, dense multi-column data views.
