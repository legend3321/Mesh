# Mesh Design System & UI Specifications (Archivo Modernist Edition)

> **Design Vision**: High-performance B2B logistics & supply chain intelligence platform inspired by the **Archivo** industrial aesthetic. Characterized by **Electric International Orange (`#FD3706`)**, **Deep Matte Charcoal (`#222026`)**, **Platinum Silver (`#DBDBDB`)**, high-contrast tri-tone KPI hero cards, textured/hatched data visualizations, and an ultra-clean minimalist icon-rail navigation shell.

---

## 1. Visual Identity & Design Pillars

### 1.1 Aesthetic Philosophy: Archivo Industrial Modernism
- **Bold & Functional**: Crisp geometric grotesque typography paired with high-impact color blocking.
- **Physical Spatial Metaphor**: Industrial hardware surfaces, tactile pill controls, and diagonal hatched textures echoing logistics containers, shipping crates, and telemetry panels.
- **Tri-Tone Color Contrasting**: Strategic pairing of deep charcoal (#222026), vivid international orange (#FD3706), and soft platinum (#DBDBDB) to establish instant optical hierarchy across dashboards.
- **Density with Breathing Room**: High data density in tables and charts balanced by generous outer canvas padding (`p-6` to `p-8`) and soft-edged container corners (`rounded-2xl`).

---

## 2. Color System & Design Tokens

### 2.1 Core Palette Tokens (Reference Specifications)

```
┌─────────────────┬─────────────────┬─────────────────┬─────────────────┐
│ Electric Orange │  Deep Charcoal  │ Platinum Silver │   Crisp White   │
│     #FD3706     │     #222026     │     #DBDBDB     │     #FFFFFF     │
│   RGB 253,55,6  │   RGB 34,32,38  │ RGB 219,219,219 │ RGB 255,255,255 │
└─────────────────┴─────────────────┴─────────────────┴─────────────────┘
```

| Token Name | Hex Code | HSL Equivalent | Tailwind Token | UI Role & Application |
|:---|:---|:---|:---|:---|
| **Electric Orange** | `#FD3706` | `hsl(12, 98%, 51%)` | `brand-orange` / `accent` | Hero KPI card, active pill switchers, key primary CTA, critical alert highlights |
| **Orange Hover** | `#E02E00` | `hsl(12, 100%, 44%)` | `brand-orange-hover` | Interactive button hover and pressed states |
| **Orange Subtlety**| `#FD37061A`| `hsla(12, 98%, 51%, 0.1)` | `brand-orange-subtle`| Badge fills, table row highlights, soft chart overlays |
| **Deep Charcoal** | `#222026` | `hsl(260, 9%, 14%)` | `brand-charcoal` | Dark hero KPI card, sidebar background/dock, dark action buttons, high-contrast headings |
| **Charcoal Hover**| `#19171C` | `hsl(260, 10%, 10%)` | `brand-charcoal-hover`| Hover state for dark buttons and interactive cards |
| **Platinum Gray** | `#DBDBDB` | `hsl(0, 0%, 86%)` | `brand-platinum` | Third KPI card background, subtle container borders, dividers |
| **Soft Canvas** | `#F3F4F7` | `hsl(220, 14%, 96%)` | `background` | Global application canvas background |
| **Surface White** | `#FFFFFF` | `hsl(0, 0%, 100%)` | `card` / `popover` | Clean dashboard cards, data grid containers, modal sheets |
| **Muted Slate** | `#6B7280` | `hsl(215, 14%, 46%)` | `muted-foreground` | Secondary labels, timestamps, metadata, inactive tab text |
| **Line Gray** | `#E5E7EB` | `hsl(220, 13%, 91%)` | `border` | Subtle internal card dividers and table borders |

### 2.2 Semantic Status Palette
Status values follow the clean, borderless colored text standard with square bullet indicator dots (`■`):

| Semantic State | Text Color | Dot Color | Value Mapping |
|:---|:---|:---|:---|
| **Optimal / Active** | `#059669` (Emerald 600) | `#059669` | `IN STOCK`, `ACTIVE`, `DELIVERED`, `COMPLETED`, `PAID` |
| **Attention / Runway** | `#D97706` (Amber 600) | `#D97706` | `LOW STOCK`, `PENDING`, `IN TRANSIT`, `PROCESSING` |
| **Critical / Deficit** | `#DC2626` (Red 600) | `#DC2626` | `OUT OF STOCK`, `CRITICAL RISK`, `CANCELLED`, `FAILED` |
| **Neutral / Archived** | `#6B7280` (Gray 500) | `#9CA3AF` | `DRAFT`, `INACTIVE`, `STANDALONE`, `EMPLOYEE` |

---

## 3. Typography: Archivo Modernist

### 3.1 Font Family Hierarchy
- **Primary Typeface**: **`Archivo`** (Google Fonts variable font: `wght@100..900`).
  - *Weights*: 400 (Regular), 500 (Medium), 600 (SemiBold), 700 (Bold), 900 (Black).
  - *Fallback Stack*: `Archivo, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`.
- **Monospace Telemetry**: **`JetBrains Mono`** / `ui-monospace`.
  - Used for SKU codes, tracking identifiers, currency tickers, and timestamp telemetry.

### 3.2 Typography Scale

| Hierarchy | Tailwind Class | Size / Line Height | Weight | Tracking | Usage |
|:---|:---|:---|:---|:---|:---|
| **KPI Metric Display**| `text-3xl font-bold` | `32px / 38px` | `700` | `-0.03em` | Primary numerical KPI values (`$14.085`, `$89 649`) |
| **Page Heading** | `text-2xl font-bold` | `24px / 30px` | `700` | `-0.02em` | Main dashboard titles, section headers |
| **Card Header** | `text-base font-semibold` | `16px / 22px` | `600` | `-0.01em` | Widget and chart card titles (`Total Orders`, `Top categories`) |
| **Body Standard** | `text-sm font-medium` | `14px / 20px` | `500` | `normal` | Navigation labels, table cell content, input text |
| **Sub-labels / Tags** | `text-xs font-medium` | `12px / 16px` | `500` | `0.01em` | Last month comparators, axis tick labels, helper hints |
| **Micro Badges** | `text-[11px] font-bold` | `11px / 14px` | `700` | `0.02em` | Percentage badges (`+21%`, `5% OFF`), pill selectors |

---

## 4. Shell & Layout Architecture

### 4.1 Master Workspace Blueprint

```
┌──────┬────────────────────────────────────────────────────────────────────────┐
│      │  Top Navbar: [App Icon + Title]   [Tenant / USD ▾] [🔍] [🔔 (2)] [Avatar]│
│      ├────────────────────────────────────────────────────────────────────────┤
│      │                                                                        │
│ DOCK │  ┌─────────────────┬─────────────────┬─────────────────┬─────────────┐  │
│ RAIL │  │ Card 1: Charcoal│ Card 2: Orange  │ Card 3: Platinum│ Right Card: │  │
│      │  │ Total Orders    │ Total Customers │ Total Revenue   │ Categories  │  │
│ [⊞]  │  │ $14.085 (📉10%) │ 1.222 (📈+79%)  │ $89 649 (📈+21%)│ (Donut 🍩)  │  │
│ [🛍]  │  │ ~~~ sparkline   │ 23% / 77% split │ ▦ heatmap grid  │             │  │
│ [👥]  │  └─────────────────┴─────────────────┴─────────────────┴─────────────┘  │
│ [📊]  │                                                                        │
│ [🚚]  │  ┌───────────────────────────────────────────────┬───────────────────┐  │
│ [💳]  │  │ Main Chart: Total Orders (Hatched Bar + Solid)│ Sales by country  │  │
│      │  │ Double-tone volume with June callout card     │ Ranked bars       │  │
│ ──── │  ├───────────────────────────────────────────────┴───────────────────┤  │
│ [⚙]  │  │ Table: Product Sales / Inventory Grid                             │  │
│ [→]  │  │ [Thumbnail] [Item Name] [Stock] [Price] [Sale] [Sold]             │  │
│      │  └───────────────────────────────────────────────────────────────────┘  │
└──────┴────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Layout Specifications
- **Viewport Canvas**: Max-width fluid container with `bg-[#F3F4F7]` background and `p-6` or `p-8` spacing.
- **Dock Rail Sidebar**:
  - Width: `72px` fixed width on desktop.
  - Floating vertical pill dock (`bg-white` or dark charcoal with `rounded-2xl`, subtle shadow `shadow-xs`, and `border border-slate-200/80`).
  - Active button state: Charcoal `#222026` or vibrant orange `#FD3706` background with crisp white icon.
  - Inactive button state: Transparent with text `#6B7280`, transitioning to `#222026` on hover.
  - Bottom controls: Settings cog and Logout action.
- **Top Bar**:
  - Left: Rounded app icon badge (Electric Orange `#FD3706` with white symbol) + Title (`Retail Inventory` / `Mesh Enterprise`).
  - Right: Currency & Tenant Selector (`USD ▾`), Quick Search trigger (`🔍`), Notification capsule with orange dot bubble indicator, and rounded profile avatar.

---

## 5. Component Specifications

### 5.1 Hero Metric KPI Cards (The Tri-Tone Row)
The top metric row features three distinctly colored cards followed by the category overview card:

#### Card 1: Deep Charcoal Card (`#222026`)
- **Background**: Solid `#222026` with `text-white`.
- **Top Row**: Label `Total Orders` (text-slate-400), right-aligned filter/tune icon.
- **Middle Metric**: Value `$14.085`, with trend pill `↘ 10%` in soft red/coral.
- **Sub-label**: `$15.650 last month`.
- **Interactive Sparkline**:
  - Recharts curved `AreaChart` with gradient fill (`rgba(255,255,255,0.15)` to `transparent`) and `stroke="#ffffff"`.
  - Floating point callout with dark border and text `$1210.6`.
  - Date ticks: `1Feb 8Feb 16Feb 25Feb 30Feb`.

#### Card 2: Electric Orange Card (`#FD3706`)
- **Background**: Solid `#FD3706` with `text-white`.
- **Top Row**: Label `Total Customers` (text-white/80), right-aligned filter icon.
- **Middle Metric**: Value `1.222`, with trend pill `↗ +79%` in white/translucent green.
- **Sub-label**: `683 users last month`.
- **Ratio Split Visual**:
  - Contained dual-color pill or segmented horizontal bar.
  - Left segment: White background with black text `23%` (Men / Inbound).
  - Right segment: Deep charcoal background with white text `77%` (Women / Outbound).
  - Bottom legend with colored indicator dots.

#### Card 3: Platinum Silver Card (`#DBDBDB`)
- **Background**: Soft platinum `#DBDBDB` (or off-white `#F0F1F4` in dark themes) with dark charcoal text `#222026`.
- **Top Row**: Label `Total Revenue`, right-aligned filter icon.
- **Middle Metric**: Value `$89 649`, with trend pill `↗ +21%` in crisp emerald green.
- **Sub-label**: `$73 925 last month`.
- **Activity Heatmap Grid**:
  - 7-column matrix (Mon, Tue, Wed, Thu, Fri, Sat, Sun) mimicking GitHub-style telemetry activity dots.
  - Highlighted column with dark tooltip badge showing day total `$1210.6`.

---

### 5.2 Category Distribution Card (Donut Chart)
- **Container**: White rounded card (`rounded-2xl bg-white border border-slate-200/60 p-5 shadow-xs`).
- **Header**: Title `Top categories` with external link arrow `↗`.
- **Chart**: Custom segmented Donut chart (`PieChart` in Recharts) with percentage labels inside segments:
  - 35% Deep Charcoal (`#222026`)
  - 20% Electric Orange (`#FD3706`)
  - 23% Textured/Hatched or Silver Gray (`#DBDBDB`)
  - 12% Light Slate
  - 10% Soft Charcoal Tint
- **Legend & Switcher**:
  - Bullet dot legend: `● T-shirts  ● Hoodies  ● Jeans  ● Jackets`.
  - Time range segmented pill selector: `[ All time | Weekly | Monthly ]` where active button is solid orange `#FD3706` with white text.

---

### 5.3 Main Telemetry Charts

#### Hatched Dual-Tone Bar Chart (`Total Orders` / `Throughput`)
- **Dual Metric Representation**:
  - Solid Charcoal bar representing `Income` / `Inbound PO`.
  - Diagonal hatched / patterned bar representing `Profit` / `Outbound Fulfillment`.
  - SVG Pattern Definition:
    ```html
    <pattern id="diagonalHatch" patternUnits="userSpaceOnUse" width="4" height="4">
      <path d="M-1,1 l2,-2 M0,4 l4,-4 M3,5 l2,-2" stroke="#222026" strokeWidth="1" />
    </pattern>
    ```
- **Highlighted Month Callout (June Feature Card)**:
  - Selected bar receives an elevated white border card with ratio fill (75% white / 25% orange).
  - Floating dark tooltip pill: `Jun, 09 • Sold 30 • Return 15`.

#### Sales by Country / Depot Capacity Chart
- Vertical ranked bar chart with percentage labels atop each bar (`25% USA`, `22% Japan`, `20% UK`, `18% Korea`, `15% Spain`).
- Interactive time switcher (`All time`, `Weekly`, `Monthly`).
- Dark primary CTA button at bottom:
  - `[ ↑ Export statistics ]` in `#222026` with `rounded-xl`, white text, and download/share icon.

---

### 5.4 Data Grid & Product Table Component

#### Table Header & Row Styling
- **Card Wrapper**: White background, `rounded-2xl`, subtle border `border-slate-200/80`, shadow `shadow-xs`.
- **Header Row**: Minimalist text labels (`Item`, `Stock`, `Old price`, `Sale`, `New price`, `Items sold`), `text-xs font-semibold text-slate-500 uppercase tracking-wider`.
- **Product Row**:
  - **Item Column**: Square rounded thumbnail image (`w-10 h-10 rounded-lg bg-slate-100 object-cover`) + Product title in bold charcoal `#222026`.
  - **Stock Column**: Clean bold numeric value (e.g. `118`, `328`).
  - **Old Price**: Subtle strikethrough or muted text (e.g. `$114.00`).
  - **Discount / Sale**: Crisp green bold text with bullet dot (e.g. `5%`, `15%`).
  - **New Price**: High-contrast bold numeric display (e.g. `$108.30`).
  - **Items Sold**: Monospace telemetry count (e.g. `294`).
- **Interactive States**: Smooth row hover (`hover:bg-slate-50/70`), no jarring background badge pills.

---

### 5.5 Form Controls, Buttons & Switchers

#### 1. Primary Action Buttons
- **Electric Orange Button**:
  - Class: `bg-[#FD3706] hover:bg-[#E02E00] text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all`
  - Usage: Key transactional actions (e.g., `Add Product`, `Auto-PO Procurement`, `Save Changes`).
- **Deep Charcoal Button**:
  - Class: `bg-[#222026] hover:bg-[#19171C] text-white font-semibold text-xs px-4 py-2.5 rounded-xl shadow-xs transition-all`
  - Usage: Secondary actions, export buttons (e.g., `Export statistics`, `Download Manifest`).

#### 2. Segmented Pill Switchers
- **Container**: `inline-flex bg-slate-100 p-1 rounded-xl gap-1 border border-slate-200/60`
- **Inactive Item**: `px-3 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-lg transition-colors`
- **Active Item**: `px-3 py-1 text-xs font-bold bg-[#FD3706] text-white rounded-lg shadow-2xs`

#### 3. Search & Text Inputs
- **Class**: `h-9 px-3.5 bg-white border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 rounded-xl focus:border-[#FD3706] focus:ring-2 focus:ring-[#FD3706]/20 transition-all`

---

## 6. Technical Implementation Blueprint

### 6.1 Font Configuration (`apps/web/app/layout.tsx`)
```tsx
import { Archivo } from "next/font/google";

const archivo = Archivo({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-archivo",
  display: "swap",
});
```

### 6.2 Tailwind Configuration (`apps/web/tailwind.config.ts`)
```ts
module.exports = {
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-archivo)", "sans-serif"],
      },
      colors: {
        brand: {
          orange: "#FD3706",
          "orange-hover": "#E02E00",
          charcoal: "#222026",
          "charcoal-hover": "#19171C",
          platinum: "#DBDBDB",
          canvas: "#F3F4F7",
        },
      },
      borderRadius: {
        "2xl": "16px",
        "3xl": "24px",
      },
    },
  },
};
```

### 6.3 Phased Migration Plan
1. **Phase 1: Foundation Setup**:
   - Add Google Font `Archivo` to Next.js font loader in root layout.
   - Update Tailwind configuration with `#FD3706`, `#222026`, and `#DBDBDB` tokens.
2. **Phase 2: Shell & Sidebar Overhaul**:
   - Refactor `Sidenav.tsx` into the ultra-modern dock-rail format with rounded icon-pills.
   - Update `Header.tsx` to match the floating top bar with orange branding.
3. **Phase 3: Dashboard & KPI Overhaul**:
   - Implement the tri-tone KPI hero cards (Charcoal `#222026`, Electric Orange `#FD3706`, Platinum `#DBDBDB`).
   - Restyle Recharts graphs with custom hatched textures and donut breakdown.
4. **Phase 4: Table & Data Grid Polish**:
   - Integrate thumbnail previews, clean typography, and modern pagination controls across `ProductTable.tsx` and `GenericEntityTable.tsx`.
