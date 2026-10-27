import { PrismaClient, Role, Status, Mode } from "@prisma/client";
import * as bcrypt from "bcrypt";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("Purging all previous records...");
  await prisma.transaction.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.transfer.deleteMany({});
  await prisma.orderdetail.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.deliveryDetail.deleteMany({});
  await prisma.delivery.deleteMany({});
  await prisma.inventory.deleteMany({});
  await prisma.warehouse.deleteMany({});
  await prisma.location.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.provider.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.company.deleteMany({});
  await prisma.companyGroup.deleteMany({});

  console.log("Seeding authentic corporate conglomerates (Company Groups)...");

  // 1. Apex Global Logistics & Intermodal Holding
  const apexGroup = await prisma.companyGroup.create({
    data: {
      groupName: "Apex Global Intermodal Group",
      groupCode: "APEX-HOLDINGS",
      industry: "Maritime Transport, Cold Chain & Intermodal Freight",
      country: "United States",
      description: "Tier-1 intermodal logistics conglomerate managing port operations, rail corridors, and smart cold storage facilities.",
    },
  });

  // 2. Celestia Robotics & Precision Hardware
  const celestiaGroup = await prisma.companyGroup.create({
    data: {
      groupName: "Celestia Robotics & Hardware Group",
      groupCode: "CELESTIA-GRP",
      industry: "Industrial Automation, Drones & Sensor Systems",
      country: "Germany",
      description: "Leading European aerospace hardware and autonomous warehouse robotics systems manufacturer.",
    },
  });

  // 3. Nordic Pulse Omnichannel & Electronics
  const nordicGroup = await prisma.companyGroup.create({
    data: {
      groupName: "Nordic Pulse Lifestyle & Electronics",
      groupCode: "NORDIC-GRP",
      industry: "Consumer Electronics, Wearables & Smart Appliances",
      country: "Sweden",
      description: "Scandinavian consumer electronics enterprise operating regional distribution centers across EMEA and North America.",
    },
  });

  console.log("Seeding distinct commercial operating companies...");

  // Apex Operating Companies
  const apexFreight = await prisma.company.create({
    data: {
      companyName: "Apex Pacific Freight Corp",
      companyCode: "APX-PAC",
      companyDomain: "pacific.apexlogistics.com",
      description: "Deepwater container logistics, multimodal rail transport, and Pacific Rim cross-docking.",
      companyGroupId: apexGroup.companyGroupId,
    },
  });

  const apexColdChain = await prisma.company.create({
    data: {
      companyName: "Apex Polar Cold Chain LLC",
      companyCode: "APX-POLAR",
      companyDomain: "polar.apexlogistics.com",
      description: "Pharmaceutical grade temperature-controlled cold chain and cryogenic transport operations.",
      companyGroupId: apexGroup.companyGroupId,
    },
  });

  // Celestia Operating Companies
  const celestiaRobotics = await prisma.company.create({
    data: {
      companyName: "Celestia Autonomous Systems",
      companyCode: "CLS-ROBOTICS",
      companyDomain: "systems.celestiarobotics.com",
      description: "Automated Guided Vehicles (AGVs), LiDAR drone fleets, and intelligent conveyor systems.",
      companyGroupId: celestiaGroup.companyGroupId,
    },
  });

  // Nordic Pulse Operating Companies
  const nordicElectronics = await prisma.company.create({
    data: {
      companyName: "Nordic Pulse Consumer Tech",
      companyCode: "NPC-TECH",
      companyDomain: "pulse.nordictech.se",
      description: "High-volume direct-to-consumer electronics and smart connected home wearables.",
      companyGroupId: nordicGroup.companyGroupId,
    },
  });

  console.log("Seeding enterprise user authentication matrix...");
  const hashedPassword = await bcrypt.hash("admin123", 10);

  // 1. SuperAdmin (Universal Platform Operator)
  await prisma.user.create({
    data: {
      userName: "Ujjwal Chaudhary (SuperAdmin)",
      userEmail: "superadmin@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.SUPERADMIN,
      companyGroupId: apexGroup.companyGroupId,
      companyId: apexFreight.companyId,
    },
  });

  // 2. Apex Pacific Freight Admin & Staff
  const apexAdmin = await prisma.user.create({
    data: {
      userName: "Marcus Vance",
      userEmail: "admin@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.ADMIN,
      companyGroupId: apexGroup.companyGroupId,
      companyId: apexFreight.companyId,
    },
  });

  const apexManager = await prisma.user.create({
    data: {
      userName: "Sarah Jenkins",
      userEmail: "s.jenkins@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.MANAGER,
      companyGroupId: apexGroup.companyGroupId,
      companyId: apexFreight.companyId,
    },
  });

  await prisma.user.create({
    data: {
      userName: "David Kim",
      userEmail: "d.kim@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.EMPLOYEE,
      companyGroupId: apexGroup.companyGroupId,
      companyId: apexFreight.companyId,
    },
  });

  // 3. Celestia Autonomous Systems Admin
  const celestiaAdmin = await prisma.user.create({
    data: {
      userName: "Dr. Klaus Becker",
      userEmail: "klaus.becker@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.ADMIN,
      companyGroupId: celestiaGroup.companyGroupId,
      companyId: celestiaRobotics.companyId,
    },
  });

  // 4. Nordic Pulse Admin & Team
  const nordicAdmin = await prisma.user.create({
    data: {
      userName: "Elena Rostova",
      userEmail: "elena.rostova@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.ADMIN,
      companyGroupId: nordicGroup.companyGroupId,
      companyId: nordicElectronics.companyId,
    },
  });

  await prisma.user.create({
    data: {
      userName: "Astrid Lindholm",
      userEmail: "astrid@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.MANAGER,
      companyGroupId: nordicGroup.companyGroupId,
      companyId: nordicElectronics.companyId,
    },
  });

  console.log("Seeding industrial facilities & real-world fulfillment hubs...");

  // Apex Pacific Freight Locations & Depots
  const apexLocSea = await prisma.location.create({
    data: {
      LocationName: "Seattle Maritime Port & Intermodal Terminal",
      LocationAddress: "3200 Alaskan Way, Terminal 18, Seattle, WA 98134",
      companyId: apexFreight.companyId,
    },
  });

  const apexLocOak = await prisma.location.create({
    data: {
      LocationName: "Oakland Inbound Inland Logistics Depot",
      LocationAddress: "530 Maritime Street, Berth 55, Oakland, CA 94607",
      companyId: apexFreight.companyId,
    },
  });

  const apexLocChi = await prisma.location.create({
    data: {
      LocationName: "Chicago BNSF Logistics Inland Hub",
      LocationAddress: "3700 S Western Ave, Yard 4, Chicago, IL 60609",
      companyId: apexFreight.companyId,
    },
  });

  const apexWhSea1 = await prisma.warehouse.create({
    data: {
      WarehouseName: "Seattle Bay 14-A Cross-Docking Terminal",
      isRefrigerated: false,
      LocationID: apexLocSea.LocationID,
      companyId: apexFreight.companyId,
    },
  });

  const apexWhSea2 = await prisma.warehouse.create({
    data: {
      WarehouseName: "Seattle Marine Container Depot C2",
      isRefrigerated: false,
      LocationID: apexLocSea.LocationID,
      companyId: apexFreight.companyId,
    },
  });

  const apexWhOak = await prisma.warehouse.create({
    data: {
      WarehouseName: "Oakland Transshipment Vault 03",
      isRefrigerated: true,
      LocationID: apexLocOak.LocationID,
      companyId: apexFreight.companyId,
    },
  });

  const apexWhChi = await prisma.warehouse.create({
    data: {
      WarehouseName: "Chicago Midwest Gateway Depot ORD-01",
      isRefrigerated: false,
      LocationID: apexLocChi.LocationID,
      companyId: apexFreight.companyId,
    },
  });

  // Celestia Robotics Facilities
  const celestiaLocMun = await prisma.location.create({
    data: {
      LocationName: "Munich Advanced Industrial Robotics Park",
      LocationAddress: "Willy-Messerschmitt-Straße 1, 82024 Taufkirchen, Germany",
      companyId: celestiaRobotics.companyId,
    },
  });

  const celestiaWhMun = await prisma.warehouse.create({
    data: {
      WarehouseName: "Munich High-Precision Cleanroom & Depot",
      isRefrigerated: true,
      LocationID: celestiaLocMun.LocationID,
      companyId: celestiaRobotics.companyId,
    },
  });

  // Nordic Pulse Facilities
  const nordicLocSto = await prisma.location.create({
    data: {
      LocationName: "Stockholm Arlanda Hub Nordic Logistics",
      LocationAddress: "Cargo City Building 402, 190 60 Stockholm-Arlanda, Sweden",
      companyId: nordicElectronics.companyId,
    },
  });

  const nordicLocRot = await prisma.location.create({
    data: {
      LocationName: "Rotterdam Maasvlakte European Gateway",
      LocationAddress: "Europaweg 900, Havennummer 8200, 3199 LD Rotterdam, Netherlands",
      companyId: nordicElectronics.companyId,
    },
  });

  const nordicWhSto = await prisma.warehouse.create({
    data: {
      WarehouseName: "Nordic Fulfilment Center ARN-01",
      isRefrigerated: false,
      LocationID: nordicLocSto.LocationID,
      companyId: nordicElectronics.companyId,
    },
  });

  const nordicWhRot = await prisma.warehouse.create({
    data: {
      WarehouseName: "Rotterdam Euro-Distribution Vault RTM-03",
      isRefrigerated: false,
      LocationID: nordicLocRot.LocationID,
      companyId: nordicElectronics.companyId,
    },
  });

  console.log("Seeding commercial enterprise vendors & institutional clients...");

  // Real world global logistics suppliers for Apex
  const apexProviderData = [
    { name: "Maersk Container Lines Logistics", address: "Esplanaden 50, 1098 Copenhagen, Denmark" },
    { name: "Schneider Electric Heavy Automation", address: "35 Rue Joseph Monier, 92500 Rueil-Malmaison, France" },
    { name: "Parker Hannifin Fluid Systems", address: "6035 Parkland Blvd, Cleveland, OH 44124" },
    { name: "Timken Industrial Bearing Corp", address: "4500 Mt Pleasant St NW, North Canton, OH 44720" },
    { name: "Honeywell Process Logistics", address: "855 S Mint St, Charlotte, NC 28202" },
  ];

  const apexProviders = [];
  for (const p of apexProviderData) {
    const prov = await prisma.provider.create({
      data: {
        ProviderName: p.name,
        ProviderAddress: p.address,
        companyId: apexFreight.companyId,
      },
    });
    apexProviders.push(prov);
  }

  // Institutional Clients for Apex
  const apexCustomerData = [
    { name: "Boeing Commercial Aerostructures", address: "100 N Riverside Plaza, Chicago, IL 60606" },
    { name: "Tesla Giga Nevada Supply Hub", address: "1 Electric Ave, Sparks, NV 89434" },
    { name: "Caterpillar Global Mining Equipment", address: "510 Lake Cook Rd, Deerfield, IL 60015" },
    { name: "General Electric Power Logistics", address: "1 Financial Center, Boston, MA 02111" },
    { name: "Siemens Mobility Americas", address: "170 Wood Ave S, Iselin, NJ 08830" },
  ];

  const apexCustomers = [];
  for (const c of apexCustomerData) {
    const cust = await prisma.customer.create({
      data: {
        CustomerName: c.name,
        CustomerAddress: c.address,
        companyId: apexFreight.companyId,
      },
    });
    apexCustomers.push(cust);
  }

  // Nordic Pulse Suppliers & Retail Accounts
  const nordicProviderData = [
    { name: "TSMC Semiconductor Foundry Corp", address: "8 Li-Hsin Rd 6, Hsinchu Science Park, Taiwan" },
    { name: "Murata Manufacturing Passive Electronics", address: "10-1 Higashikotari 1-chome, Nagaokakyo, Kyoto, Japan" },
    { name: "Sony Semiconductor Sensor Division", address: "1-7-1 Konan, Minato-ku, Tokyo, Japan" },
    { name: "LG Energy Solutions Battery Cells", address: "108 Yeoui-daero, Yeongdeungpo-gu, Seoul, South Korea" },
  ];

  const nordicProviders = [];
  for (const p of nordicProviderData) {
    const prov = await prisma.provider.create({
      data: {
        ProviderName: p.name,
        ProviderAddress: p.address,
        companyId: nordicElectronics.companyId,
      },
    });
    nordicProviders.push(prov);
  }

  const nordicCustomerData = [
    { name: "Amazon EU S.a.r.l. Fulfillment", address: "38 Avenue John F. Kennedy, L-1855 Luxembourg" },
    { name: "MediaMarktSaturn Retail Group", address: "Klaus-Bungert-Straße 5, 40468 Düsseldorf, Germany" },
    { name: "Elgiganten Nordic AB", address: "Kanalvägen 10A, 194 61 Upplands Väsby, Sweden" },
    { name: "Best Buy Global Supply Chain", address: "7601 Penn Ave S, Richfield, MN 55423" },
  ];

  const nordicCustomers = [];
  for (const c of nordicCustomerData) {
    const cust = await prisma.customer.create({
      data: {
        CustomerName: c.name,
        CustomerAddress: c.address,
        companyId: nordicElectronics.companyId,
      },
    });
    nordicCustomers.push(cust);
  }

  console.log("Seeding real-world product catalog (SKUs)...");

  // Apex Catalog: Industrial Freight, Logistics, High-Torque Motors & Actuators
  const apexCatalogData = [
    {
      code: "MSH-9402-TX",
      barcode: "840912009402",
      name: "V-900 Dual Rotary Actuator",
      description: "Heavy-duty dual-drive rotary actuator with integrated pneumatic feedback sensors for automated conveyor sortation.",
      category: "Fluid Control & Motion",
      cost: 412.50,
      sell: 620.00,
      retail: 780.00,
      reorder: 120,
      weight: 14.5,
      height: 38,
      width: 28,
      depth: 22,
      refrigerated: false,
    },
    {
      code: "MSH-7721-JP",
      barcode: "840912007721",
      name: "Brushless High-Torque Motor 48V",
      description: "Precision brushless DC motor engineered for automated container cranes and high-load AGV chassis.",
      category: "Power & Propulsion",
      cost: 285.00,
      sell: 445.00,
      retail: 550.00,
      reorder: 100,
      weight: 9.8,
      height: 25,
      width: 20,
      depth: 20,
      refrigerated: false,
    },
    {
      code: "MSH-3180-EU",
      barcode: "840912003180",
      name: "Optical Infrared Gate Sensor S-40",
      description: "High-frequency multi-beam infrared safety barrier gate for conveyor pallet classification and obstruction triage.",
      category: "Sensors & Optical I/O",
      cost: 94.00,
      sell: 158.00,
      retail: 210.00,
      reorder: 150,
      weight: 2.1,
      height: 120,
      width: 8,
      depth: 8,
      refrigerated: false,
    },
    {
      code: "MSH-5510-CH",
      barcode: "840912005510",
      name: "Cryogenic Temperature Sensor Probe T-80",
      description: "Sub-zero platinum RTD sensor with ultra-low thermal drift for liquid nitrogen and deep cold chain monitoring.",
      category: "Cold Chain Telemetry",
      cost: 165.00,
      sell: 275.00,
      retail: 340.00,
      reorder: 80,
      weight: 0.85,
      height: 30,
      width: 10,
      depth: 6,
      refrigerated: true,
    },
    {
      code: "MSH-6204-US",
      barcode: "840912006204",
      name: "Reinforced Kevlar Conveyor Belt (50m)",
      description: "High tensile multi-ply Kevlar carcass belting with oil-resistant neoprene cover for high-tonnage parcel terminals.",
      category: "Fluid Control & Motion",
      cost: 1250.00,
      sell: 1850.00,
      retail: 2200.00,
      reorder: 30,
      weight: 85.0,
      height: 90,
      width: 90,
      depth: 60,
      refrigerated: false,
    },
    {
      code: "MSH-8109-SG",
      barcode: "840912008109",
      name: "Industrial RFID Transponder Beacon Array",
      description: "UHF EPC Gen2 long-range pallet tracking transponders with anti-collision algorithm for multi-tier staging yards.",
      category: "Sensors & Optical I/O",
      cost: 42.00,
      sell: 78.00,
      retail: 110.00,
      reorder: 250,
      weight: 1.4,
      height: 15,
      width: 15,
      depth: 10,
      refrigerated: false,
    },
    {
      code: "MSH-4418-DE",
      barcode: "840912004418",
      name: "Hydraulic Proportional Flow Valve Pro-9",
      description: "Direct-operated electro-hydraulic proportional directional spool valve with onboard digital driver electronics.",
      category: "Fluid Control & Motion",
      cost: 580.00,
      sell: 890.00,
      retail: 1120.00,
      reorder: 40,
      weight: 12.0,
      height: 22,
      width: 18,
      depth: 16,
      refrigerated: false,
    },
    {
      code: "MSH-2099-UK",
      barcode: "840912002099",
      name: "Lithium Ferro Phosphate Auxiliary Pack 5kWh",
      description: "Modular LiFePO4 battery pack with automotive-grade CAN bus telemetry for terminal electric yard tractors.",
      category: "Power & Propulsion",
      cost: 1680.00,
      sell: 2450.00,
      retail: 2950.00,
      reorder: 25,
      weight: 42.0,
      height: 35,
      width: 45,
      depth: 30,
      refrigerated: false,
    },
  ];

  const apexProducts = [];
  for (const item of apexCatalogData) {
    const p = await prisma.product.create({
      data: {
        ProductCode: item.code,
        BarCode: item.barcode,
        ProductName: item.name,
        ProductDescription: item.description,
        ProductCategory: item.category,
        CostPrice: item.cost,
        SellPrice: item.sell,
        MaxretailPrice: item.retail,
        ReorderQuantity: item.reorder,
        PackedWeight: item.weight,
        PackedHeight: item.height,
        PackedWidth: item.width,
        PackedDepth: item.depth,
        Refrigerated: item.refrigerated,
        companyId: apexFreight.companyId,
      },
    });
    apexProducts.push(p);
  }

  // Nordic Pulse Catalog: Premium Consumer Electronics & Smart IoT
  const nordicCatalogData = [
    {
      code: "NP-AUD-100",
      barcode: "735008000100",
      name: "Nordic Sound Pro Studio ANC Headphones",
      description: "Audiophile closed-back wireless headphones with active noise cancellation, beryllium drivers and 40h battery.",
      category: "Acoustics & Audio",
      cost: 145.00,
      sell: 279.00,
      retail: 349.00,
      reorder: 150,
      weight: 0.85,
      height: 22,
      width: 18,
      depth: 10,
      refrigerated: false,
    },
    {
      code: "NP-DSP-270",
      barcode: "735008000270",
      name: "Nordic Horizon 27\" OLED Ultra-Sync 240Hz",
      description: "Curved 4K quantum dot OLED workstation display with 0.03ms response time and 99% DCI-P3 color gamut.",
      category: "Displays & Workstations",
      cost: 410.00,
      sell: 699.00,
      retail: 849.00,
      reorder: 60,
      weight: 7.2,
      height: 48,
      width: 68,
      depth: 18,
      refrigerated: false,
    },
    {
      code: "NP-IOT-090",
      barcode: "735008000090",
      name: "Pulse Smart Health Chronometer Gen 4",
      description: "Titanium chassis smartwatch with medical-grade ECG, SpO2 sensor, sapphire crystal face, and 100m water resistance.",
      category: "Wearables & Sensors",
      cost: 165.00,
      sell: 329.00,
      retail: 399.00,
      reorder: 120,
      weight: 0.35,
      height: 12,
      width: 12,
      depth: 8,
      refrigerated: false,
    },
    {
      code: "NP-PWR-140",
      barcode: "735008000140",
      name: "Nordic GaN Fast-Charge Powerstation 140W",
      description: "Gallium Nitride 4-port rapid charging block with Power Delivery 3.1 and intelligent temperature management.",
      category: "Power Systems",
      cost: 32.00,
      sell: 79.00,
      retail: 99.00,
      reorder: 200,
      weight: 0.42,
      height: 10,
      width: 8,
      depth: 6,
      refrigerated: false,
    },
    {
      code: "NP-AIR-400",
      barcode: "735008000400",
      name: "Nordic PureFlow HEPA H13 Air Sanitizer",
      description: "Connected smart air purifier with laser particle counter, dual HEPA H13 filtration, and automated ion generator.",
      category: "Smart Climate",
      cost: 110.00,
      sell: 229.00,
      retail: 279.00,
      reorder: 75,
      weight: 5.5,
      height: 52,
      width: 26,
      depth: 26,
      refrigerated: false,
    },
    {
      code: "NP-SEC-4K",
      barcode: "735008000404",
      name: "Nordic Guardian 4K Solar Security Dome",
      description: "Autonomous exterior 4K HDR vision system with solar panel battery, AI person detection, and dual-band Wi-Fi 6.",
      category: "Smart Vision & Security",
      cost: 85.00,
      sell: 179.00,
      retail: 219.00,
      reorder: 90,
      weight: 1.1,
      height: 20,
      width: 18,
      depth: 14,
      refrigerated: false,
    },
  ];

  const nordicProducts = [];
  for (const item of nordicCatalogData) {
    const p = await prisma.product.create({
      data: {
        ProductCode: item.code,
        BarCode: item.barcode,
        ProductName: item.name,
        ProductDescription: item.description,
        ProductCategory: item.category,
        CostPrice: item.cost,
        SellPrice: item.sell,
        MaxretailPrice: item.retail,
        ReorderQuantity: item.reorder,
        PackedWeight: item.weight,
        PackedHeight: item.height,
        PackedWidth: item.width,
        PackedDepth: item.depth,
        Refrigerated: item.refrigerated,
        companyId: nordicElectronics.companyId,
      },
    });
    nordicProducts.push(p);
  }

  console.log("Seeding real inventory allocations with operational stockout telemetry...");

  // Apex Inventory:
  // Setup exact stock levels so ML forecaster and live telemetry produce realistic stockout warnings:
  // Item 0 (V-900 Dual Rotary Actuator) -> Optimal Healthy Buffer (1,480 in stock, safe)
  // Item 1 (Brushless High-Torque Motor) -> CRITICAL DEFICIT (12 units, burn 14/d -> 0.8d runway)
  // Item 2 (Optical Infrared Gate Sensor) -> WARNING BUFFER (112 units, burn 22/d -> 5.1d runway)
  // Others -> Healthy distributed levels across Seattle, Oakland, and Chicago

  const apexInventories = [];
  for (let i = 0; i < apexProducts.length; i++) {
    const prod = apexProducts[i];

    if (i === 0) {
      // MSH-9402-TX: 1,480 units in Seattle, 820 in Chicago
      apexInventories.push(
        await prisma.inventory.create({
          data: {
            InventoryAvailable: 1480,
            MinStockLevel: 200,
            MaxStockLevel: 2500,
            ReorderPoint: 400,
            ProductID: prod.ProductID,
            WarehouseID: apexWhSea1.WarehouseID,
            companyId: apexFreight.companyId,
          },
        }),
        await prisma.inventory.create({
          data: {
            InventoryAvailable: 820,
            MinStockLevel: 100,
            MaxStockLevel: 1500,
            ReorderPoint: 250,
            ProductID: prod.ProductID,
            WarehouseID: apexWhChi.WarehouseID,
            companyId: apexFreight.companyId,
          },
        })
      );
    } else if (i === 1) {
      // MSH-7721-JP: Critical 12 units in Seattle, 18 in Oakland
      apexInventories.push(
        await prisma.inventory.create({
          data: {
            InventoryAvailable: 12,
            MinStockLevel: 50,
            MaxStockLevel: 600,
            ReorderPoint: 100,
            ProductID: prod.ProductID,
            WarehouseID: apexWhSea1.WarehouseID,
            companyId: apexFreight.companyId,
          },
        }),
        await prisma.inventory.create({
          data: {
            InventoryAvailable: 18,
            MinStockLevel: 40,
            MaxStockLevel: 400,
            ReorderPoint: 80,
            ProductID: prod.ProductID,
            WarehouseID: apexWhOak.WarehouseID,
            companyId: apexFreight.companyId,
          },
        })
      );
    } else if (i === 2) {
      // MSH-3180-EU: Warning 112 units in Seattle, 95 in Chicago
      apexInventories.push(
        await prisma.inventory.create({
          data: {
            InventoryAvailable: 112,
            MinStockLevel: 80,
            MaxStockLevel: 1000,
            ReorderPoint: 200,
            ProductID: prod.ProductID,
            WarehouseID: apexWhSea2.WarehouseID,
            companyId: apexFreight.companyId,
          },
        }),
        await prisma.inventory.create({
          data: {
            InventoryAvailable: 95,
            MinStockLevel: 60,
            MaxStockLevel: 800,
            ReorderPoint: 150,
            ProductID: prod.ProductID,
            WarehouseID: apexWhChi.WarehouseID,
            companyId: apexFreight.companyId,
          },
        })
      );
    } else if (i === 3) {
      // MSH-5510-CH: Cold Chain item in Oakland cold facility
      apexInventories.push(
        await prisma.inventory.create({
          data: {
            InventoryAvailable: 340,
            MinStockLevel: 50,
            MaxStockLevel: 600,
            ReorderPoint: 120,
            ProductID: prod.ProductID,
            WarehouseID: apexWhOak.WarehouseID,
            companyId: apexFreight.companyId,
          },
        })
      );
    } else {
      // Other items
      apexInventories.push(
        await prisma.inventory.create({
          data: {
            InventoryAvailable: 240 + i * 45,
            MinStockLevel: 40,
            MaxStockLevel: 800,
            ReorderPoint: 100,
            ProductID: prod.ProductID,
            WarehouseID: i % 2 === 0 ? apexWhSea1.WarehouseID : apexWhChi.WarehouseID,
            companyId: apexFreight.companyId,
          },
        })
      );
    }
  }

  // Nordic Inventory Allocations
  for (let i = 0; i < nordicProducts.length; i++) {
    const prod = nordicProducts[i];
    await prisma.inventory.create({
      data: {
        InventoryAvailable: i === 0 ? 15 : 210 + i * 35, // Item 0 low stock
        MinStockLevel: 30,
        MaxStockLevel: 500,
        ReorderPoint: 80,
        ProductID: prod.ProductID,
        WarehouseID: i % 2 === 0 ? nordicWhSto.WarehouseID : nordicWhRot.WarehouseID,
        companyId: nordicElectronics.companyId,
      },
    });
  }

  console.log("Seeding authentic purchase orders, settlements and delivery schedules...");

  // Real Purchase Orders for Apex
  const apexOrderDates = [
    new Date("2026-10-18T09:30:00Z"),
    new Date("2026-10-21T14:15:00Z"),
    new Date("2026-10-23T11:00:00Z"),
    new Date("2026-10-25T16:45:00Z"),
    new Date("2026-10-26T08:20:00Z"),
  ];

  const apexOrders = [];
  for (let i = 0; i < apexOrderDates.length; i++) {
    const prov = apexProviders[i % apexProviders.length];
    const order = await prisma.order.create({
      data: {
        OrderDate: apexOrderDates[i],
        ProviderID: prov.ProviderID,
        companyId: apexFreight.companyId,
      },
    });
    apexOrders.push(order);

    const orderedProduct = apexProducts[i % apexProducts.length];
    const qty = 80 + i * 30;
    const expDate = new Date(apexOrderDates[i]);
    expDate.setDate(expDate.getDate() + 5);

    await prisma.orderdetail.create({
      data: {
        OrderQuantity: qty,
        ExpectedDate: expDate,
        ActualDate: i < 3 ? new Date(apexOrderDates[i].getTime() + 4 * 86400000) : null,
        ProductIDs: [orderedProduct.ProductID],
        OrderID: order.OrderID,
      },
    });

    const amount = orderedProduct.CostPrice * qty;
    await prisma.payment.create({
      data: {
        PaymentAmount: Math.round(amount * 100) / 100,
        PaymentStatus: i < 3 ? Status.COMPLETED : Status.PROCESSING,
        PaymentMode: Mode.ONLINE,
        PaymentDescription: `Wire settlement for PO-${order.OrderID.slice(-6).toUpperCase()} to ${prov.ProviderName}`,
        OrderID: order.OrderID,
        companyId: apexFreight.companyId,
      },
    });
  }

  // Real Customer Deliveries for Apex
  const apexDeliveryDates = [
    new Date("2026-10-19T10:00:00Z"),
    new Date("2026-10-22T13:30:00Z"),
    new Date("2026-10-24T09:15:00Z"),
    new Date("2026-10-26T15:00:00Z"),
  ];

  for (let i = 0; i < apexDeliveryDates.length; i++) {
    const cust = apexCustomers[i % apexCustomers.length];
    const delivery = await prisma.delivery.create({
      data: {
        SalesDate: apexDeliveryDates[i],
        CustomerID: cust.CustomerID,
        companyId: apexFreight.companyId,
      },
    });

    const deliveredProduct = apexProducts[(i + 2) % apexProducts.length];
    const delivExp = new Date(apexDeliveryDates[i]);
    delivExp.setDate(delivExp.getDate() + 3);

    await prisma.deliveryDetail.create({
      data: {
        DeliveryQuantity: 24 + i * 12,
        ExpectedDate: delivExp,
        ActualDate: i < 2 ? new Date(apexDeliveryDates[i].getTime() + 2 * 86400000) : null,
        ProductID: deliveredProduct.ProductID,
        DeliveryID: delivery.DeliveryID,
      },
    });
  }

  // Intermodal transfers between Seattle, Oakland and Chicago
  await prisma.transfer.create({
    data: {
      TransferQuantity: 60,
      SentDate: new Date("2026-10-22T08:00:00Z"),
      RecievedDate: new Date("2026-10-25T17:30:00Z"),
      ProductID: apexProducts[0].ProductID, // V-900 Actuator
      OutWarehouseID: apexWhSea1.WarehouseID,
      InWarehouseID: apexWhChi.WarehouseID,
      companyId: apexFreight.companyId,
    },
  });

  await prisma.transfer.create({
    data: {
      TransferQuantity: 40,
      SentDate: new Date("2026-10-26T10:30:00Z"),
      RecievedDate: null, // In-transit
      ProductID: apexProducts[1].ProductID, // Motor 48V
      OutWarehouseID: apexWhOak.WarehouseID,
      InWarehouseID: apexWhSea1.WarehouseID,
      companyId: apexFreight.companyId,
    },
  });

  // Nordic Pulse Orders & Deliveries
  const nordicOrder = await prisma.order.create({
    data: {
      OrderDate: new Date("2026-10-20T11:00:00Z"),
      ProviderID: nordicProviders[0].ProviderID,
      companyId: nordicElectronics.companyId,
    },
  });

  await prisma.orderdetail.create({
    data: {
      OrderQuantity: 250,
      ExpectedDate: new Date("2026-10-28T12:00:00Z"),
      ActualDate: null,
      ProductIDs: [nordicProducts[0].ProductID],
      OrderID: nordicOrder.OrderID,
    },
  });

  await prisma.payment.create({
    data: {
      PaymentAmount: 36250.00,
      PaymentStatus: Status.COMPLETED,
      PaymentMode: Mode.ONLINE,
      PaymentDescription: "TSMC SoC fabrication batch PO settlement",
      OrderID: nordicOrder.OrderID,
      companyId: nordicElectronics.companyId,
    },
  });

  console.log("Seeding immutable audit telemetry log events...");
  await prisma.transaction.create({
    data: {
      TransactionDetail: "Seattle Bay 14-A Terminal: Inbound manifest clearance for 1,480 units MSH-9402-TX.",
      UserID: apexAdmin.userId,
      companyId: apexFreight.companyId,
    },
  });

  await prisma.transaction.create({
    data: {
      TransactionDetail: "Automated Telemetry Flag: MSH-7721-JP inventory dropped to 12 units (< minStock 50). Critical reorder requisition recommended.",
      UserID: apexManager.userId,
      companyId: apexFreight.companyId,
    },
  });

  await prisma.transaction.create({
    data: {
      TransactionDetail: "Transfer TR-8820 initiated: 40 units MSH-7721-JP in-transit from Oakland to Seattle.",
      UserID: apexManager.userId,
      companyId: apexFreight.companyId,
    },
  });

  console.log("\n========================================================");
  console.log("✨ All previous data cleared and real-world dataset injected!");
  console.log("========================================================");
  console.log("Corporate Groups Seeded:");
  console.log("  1. Apex Global Intermodal Group (APEX-HOLDINGS)");
  console.log("  2. Celestia Robotics & Hardware Group (CELESTIA-GRP)");
  console.log("  3. Nordic Pulse Lifestyle & Electronics (NORDIC-GRP)");
  console.log("\nDemo Login Credentials (Password: admin123):");
  console.log("  • SuperAdmin:     superadmin@mesh.com");
  console.log("  • Apex Admin:     admin@mesh.com");
  console.log("  • Nordic Admin:   elena.rostova@mesh.com");
  console.log("  • Celestia Admin: klaus.becker@mesh.com");
  console.log("========================================================\n");
}

main()
  .catch((e) => {
    console.error("Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
