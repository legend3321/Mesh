import { PrismaClient, Role, Status, Mode } from "@prisma/client";
import { faker } from "@faker-js/faker";
import * as bcrypt from "bcrypt";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning old database collections...");
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

  console.log("Seeding company groups (conglomerates)...");
  const apexGroup = await prisma.companyGroup.create({
    data: {
      groupName: "Apex Enterprise Holdings",
      groupCode: "APEX-GRP",
      industry: "Logistics, Cold Chain & Intermodal Freight",
      country: "United States",
      description: "Premier global freight, maritime transport, and autonomous distribution conglomerate.",
    },
  });

  const starlightGroup = await prisma.companyGroup.create({
    data: {
      groupName: "Starlight Omnichannel Conglomerate",
      groupCode: "STAR-GRP",
      industry: "Luxury Retail & Consumer Electronics",
      country: "United Kingdom",
      description: "International luxury apparel, lifestyle brands, and connected consumer hardware.",
    },
  });

  const nexusGroup = await prisma.companyGroup.create({
    data: {
      groupName: "Nexus Industrial Alliance",
      groupCode: "NEXUS-GRP",
      industry: "Precision Manufacturing & Aerospace Parts",
      country: "Germany",
      description: "High-spec robotics, tier-1 automotive components, and heavy industrial assembly.",
    },
  });

  console.log("Seeding companies (multi-tenant)...");
  const apexCompany = await prisma.company.create({
    data: {
      companyName: "Apex Logistics Corp",
      companyCode: "APEX-01",
      companyDomain: "apexlogistics.com",
      description: "Global freight, cold chain, and high-velocity distribution enterprise.",
      companyGroupId: apexGroup.companyGroupId,
    },
  });

  const apexAirCompany = await prisma.company.create({
    data: {
      companyName: "Apex Air Freight Worldwide",
      companyCode: "APEX-02",
      companyDomain: "air.apexlogistics.com",
      description: "Express air cargo, priority customs clearance, and aviation logistics.",
      companyGroupId: apexGroup.companyGroupId,
    },
  });

  const starlightCompany = await prisma.company.create({
    data: {
      companyName: "Starlight Global Retail",
      companyCode: "STAR-02",
      companyDomain: "starlight.io",
      description: "Omnichannel luxury retail, consumer electronics, and smart IoT fulfillment.",
      companyGroupId: starlightGroup.companyGroupId,
    },
  });

  console.log("Seeding multi-tenant users & SuperAdmin...");
  const hashedPassword = await bcrypt.hash("admin123", 10);

  // Platform SuperAdmin
  const superAdmin = await prisma.user.create({
    data: {
      userName: "Ujjwal Chaudhary (SuperAdmin)",
      userEmail: "superadmin@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.SUPERADMIN,
      companyGroupId: apexGroup.companyGroupId,
      companyId: apexCompany.companyId,
    },
  });

  // Apex Users
  const apexAdmin = await prisma.user.create({
    data: {
      userName: "Ujjwal Chaudhary",
      userEmail: "admin@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.ADMIN,
      companyGroupId: apexGroup.companyGroupId,
      companyId: apexCompany.companyId,
    },
  });

  await prisma.user.create({
    data: {
      userName: "Alex Turner",
      userEmail: "manager@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.MANAGER,
      companyGroupId: apexGroup.companyGroupId,
      companyId: apexCompany.companyId,
    },
  });

  await prisma.user.create({
    data: {
      userName: "Sarah Chen",
      userEmail: "sarah.logistics@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.EMPLOYEE,
      companyGroupId: apexGroup.companyGroupId,
      companyId: apexCompany.companyId,
    },
  });

  // Starlight Users
  const starlightAdmin = await prisma.user.create({
    data: {
      userName: "Elena Rostova",
      userEmail: "starlight.admin@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.ADMIN,
      companyGroupId: starlightGroup.companyGroupId,
      companyId: starlightCompany.companyId,
    },
  });

  await prisma.user.create({
    data: {
      userName: "Marcus Vance",
      userEmail: "starlight.manager@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.MANAGER,
      companyGroupId: starlightGroup.companyGroupId,
      companyId: starlightCompany.companyId,
    },
  });

  await prisma.user.create({
    data: {
      userName: "Chloe Bennett",
      userEmail: "starlight.staff@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.EMPLOYEE,
      companyGroupId: starlightGroup.companyGroupId,
      companyId: starlightCompany.companyId,
    },
  });

  // Nexus Industrial Alliance Company & User
  const nexusCompany = await prisma.company.create({
    data: {
      companyName: "Nexus Precision Robotics",
      companyCode: "NEX-01",
      companyDomain: "nexusrobotics.de",
      description: "Autonomous industrial robotic arms, high-torque actuators, and smart sensors.",
      companyGroupId: nexusGroup.companyGroupId,
    },
  });

  await prisma.user.create({
    data: {
      userName: "Dr. Klaus Becker",
      userEmail: "nexus.admin@mesh.com",
      userPassword: hashedPassword,
      userRole: Role.ADMIN,
      companyGroupId: nexusGroup.companyGroupId,
      companyId: nexusCompany.companyId,
    },
  });

  console.log("Seeding multi-tenant locations and warehouses...");
  // Apex Locations
  const apexLoc1 = await prisma.location.create({
    data: {
      LocationName: "Seattle Mega Distribution Hub",
      LocationAddress: "101 Industrial Way, Seattle, WA",
      companyId: apexCompany.companyId,
    },
  });
  const apexLoc2 = await prisma.location.create({
    data: {
      LocationName: "Newark Inland Port & Depot",
      LocationAddress: "450 Harbor Boulevard, Newark, NJ",
      companyId: apexCompany.companyId,
    },
  });

  // Apex Warehouses
  const apexWh1 = await prisma.warehouse.create({
    data: {
      WarehouseName: "Apex Ambient Storage A1",
      isRefrigerated: false,
      LocationID: apexLoc1.LocationID,
      companyId: apexCompany.companyId,
    },
  });
  const apexWh2 = await prisma.warehouse.create({
    data: {
      WarehouseName: "Apex Cold Chain Facility B1",
      isRefrigerated: true,
      LocationID: apexLoc1.LocationID,
      companyId: apexCompany.companyId,
    },
  });
  const apexWh3 = await prisma.warehouse.create({
    data: {
      WarehouseName: "Apex Fast Transit Bay",
      isRefrigerated: false,
      LocationID: apexLoc2.LocationID,
      companyId: apexCompany.companyId,
    },
  });

  // Starlight Locations
  const starLoc1 = await prisma.location.create({
    data: {
      LocationName: "Silicon Valley Tech Gateway",
      LocationAddress: "220 Innovation Way, San Jose, CA",
      companyId: starlightCompany.companyId,
    },
  });
  const starLoc2 = await prisma.location.create({
    data: {
      LocationName: "Austin Fulfillment Center",
      LocationAddress: "800 Lone Star Pkwy, Austin, TX",
      companyId: starlightCompany.companyId,
    },
  });

  // Starlight Warehouses
  const starWh1 = await prisma.warehouse.create({
    data: {
      WarehouseName: "Starlight Quantum Vault",
      isRefrigerated: true,
      LocationID: starLoc1.LocationID,
      companyId: starlightCompany.companyId,
    },
  });
  const starWh2 = await prisma.warehouse.create({
    data: {
      WarehouseName: "Starlight Air Logistics Depot",
      isRefrigerated: false,
      LocationID: starLoc2.LocationID,
      companyId: starlightCompany.companyId,
    },
  });

  console.log("Seeding providers and customers for both companies...");
  // Apex Providers & Customers
  const apexProviders = [];
  for (let i = 0; i < 4; i++) {
    const prov = await prisma.provider.create({
      data: {
        ProviderName: `Apex Supplier ${faker.company.name()}`,
        ProviderAddress: faker.location.streetAddress({ useFullAddress: true }),
        companyId: apexCompany.companyId,
      },
    });
    apexProviders.push(prov);
  }

  const apexCustomers = [];
  for (let i = 0; i < 4; i++) {
    const cust = await prisma.customer.create({
      data: {
        CustomerName: faker.person.fullName(),
        CustomerAddress: faker.location.streetAddress({ useFullAddress: true }),
        companyId: apexCompany.companyId,
      },
    });
    apexCustomers.push(cust);
  }

  // Starlight Providers & Customers
  const starProviders = [];
  for (let i = 0; i < 4; i++) {
    const prov = await prisma.provider.create({
      data: {
        ProviderName: `Starlight Hardware Partner ${faker.company.name()}`,
        ProviderAddress: faker.location.streetAddress({ useFullAddress: true }),
        companyId: starlightCompany.companyId,
      },
    });
    starProviders.push(prov);
  }

  const starCustomers = [];
  for (let i = 0; i < 4; i++) {
    const cust = await prisma.customer.create({
      data: {
        CustomerName: faker.person.fullName(),
        CustomerAddress: faker.location.streetAddress({ useFullAddress: true }),
        companyId: starlightCompany.companyId,
      },
    });
    starCustomers.push(cust);
  }

  console.log("Seeding multi-tenant products...");
  // Apex Products (Freight, Logistics, Heavy Supplies)
  const apexProductNames = [
    "Industrial Hydraulic Coolant 50L",
    "Reinforced Heavy Duty Conveyor Belt",
    "Thermal Insulated Pallet Wrap",
    "Cryogenic Nitrogen Storage Vial",
    "Anti-Static Packaging Foam",
    "Steel Banding Strapping Reel",
    "Automated Guided Vehicle Sensor Pack",
    "RFID Inventory Tracking Beacon",
    "Pneumatic Air Compressor Hose",
    "Hazardous Material Spill Containment Kit",
  ];

  const apexProducts = [];
  for (let i = 0; i < apexProductNames.length; i++) {
    const cost = 45 + i * 15;
    const prod = await prisma.product.create({
      data: {
        ProductCode: `APX-${1000 + i}`,
        BarCode: `890123${1000 + i}`,
        ProductName: apexProductNames[i],
        ProductDescription: `High durability industrial logistics supply: ${apexProductNames[i]}`,
        ProductCategory: i % 2 === 0 ? "Logistics Hardware" : "Cold Chain Materials",
        CostPrice: cost,
        SellPrice: Math.round(cost * 1.35 * 100) / 100,
        MaxretailPrice: Math.round(cost * 1.6 * 100) / 100,
        ReorderQuantity: 20 + i * 2,
        PackedWeight: 5.5 + i * 1.2,
        PackedHeight: 30 + i * 2,
        PackedWidth: 25,
        PackedDepth: 25,
        Refrigerated: i % 3 === 0,
        companyId: apexCompany.companyId,
      },
    });
    apexProducts.push(prod);
  }

  // Starlight Products (Consumer Electronics, Smart Gear)
  const starProductNames = [
    "Starlight Quantum Drone 4K",
    "Aero Pro Active Noise-Canceling Headset",
    "Horizon Ultra-Slim OLED Monitor 27\"",
    "Pulse Smartwatch Series 9",
    "Vortex Mechanical Wireless Keyboard",
    "Zenith RGB Ergonomic Gaming Mouse",
    "Titan GaN Fast Charger 140W",
    "Nebula High-Res Smart Security Cam",
  ];

  const starProducts = [];
  for (let i = 0; i < starProductNames.length; i++) {
    const cost = 120 + i * 60;
    const prod = await prisma.product.create({
      data: {
        ProductCode: `STR-${2000 + i}`,
        BarCode: `770555${2000 + i}`,
        ProductName: starProductNames[i],
        ProductDescription: `Flagship consumer electronic device: ${starProductNames[i]}`,
        ProductCategory: i % 2 === 0 ? "Wearables & Audio" : "Displays & Computing",
        CostPrice: cost,
        SellPrice: Math.round(cost * 1.45 * 100) / 100,
        MaxretailPrice: Math.round(cost * 1.8 * 100) / 100,
        ReorderQuantity: 15 + i * 3,
        PackedWeight: 1.2 + i * 0.4,
        PackedHeight: 15 + i * 2,
        PackedWidth: 15,
        PackedDepth: 10,
        Refrigerated: false,
        companyId: starlightCompany.companyId,
      },
    });
    starProducts.push(prod);
  }

  console.log("Seeding multi-tenant inventories...");
  for (let pIdx = 0; pIdx < apexProducts.length; pIdx++) {
    const prod = apexProducts[pIdx];
    for (let wIdx = 0; wIdx < [apexWh1, apexWh2, apexWh3].length; wIdx++) {
      const wh = [apexWh1, apexWh2, apexWh3][wIdx];
      // Intentionally simulate a few high-risk SKUs for ML stockout forecasting demonstration
      let stock = faker.number.int({ min: 45, max: 350 });
      if (pIdx === 0 && wIdx === 0) stock = 9; // Critical Stockout (< MinStock 30)
      if (pIdx === 1 && wIdx === 0) stock = 16; // Critical Stockout
      if (pIdx === 2 && wIdx === 1) stock = 38; // Warning (< ReorderPoint 60)

      await prisma.inventory.create({
        data: {
          InventoryAvailable: stock,
          MinStockLevel: 30,
          MaxStockLevel: 500,
          ReorderPoint: 60,
          ProductID: prod.ProductID,
          WarehouseID: wh.WarehouseID,
          companyId: apexCompany.companyId,
        },
      });
    }
  }

  for (let pIdx = 0; pIdx < starProducts.length; pIdx++) {
    const prod = starProducts[pIdx];
    for (let wIdx = 0; wIdx < [starWh1, starWh2].length; wIdx++) {
      const wh = [starWh1, starWh2][wIdx];
      let stock = faker.number.int({ min: 35, max: 200 });
      if (pIdx === 0 && wIdx === 0) stock = 8; // Critical Stockout for Starlight
      if (pIdx === 1 && wIdx === 1) stock = 14; // Critical Stockout for Starlight

      await prisma.inventory.create({
        data: {
          InventoryAvailable: stock,
          MinStockLevel: 20,
          MaxStockLevel: 350,
          ReorderPoint: 40,
          ProductID: prod.ProductID,
          WarehouseID: wh.WarehouseID,
          companyId: starlightCompany.companyId,
        },
      });
    }
  }

  console.log("Seeding multi-tenant orders and payments...");
  // Apex Orders & Payments
  for (let i = 0; i < 4; i++) {
    const prov = apexProviders[i % apexProviders.length];
    const order = await prisma.order.create({
      data: {
        OrderDate: faker.date.recent({ days: 10 }),
        ProviderID: prov.ProviderID,
        companyId: apexCompany.companyId,
      },
    });

    const chosenProd = apexProducts[i % apexProducts.length];
    await prisma.orderdetail.create({
      data: {
        OrderQuantity: faker.number.int({ min: 20, max: 100 }),
        ExpectedDate: faker.date.soon({ days: 7 }),
        ActualDate: i % 2 === 0 ? faker.date.recent({ days: 2 }) : null,
        ProductIDs: [chosenProd.ProductID],
        OrderID: order.OrderID,
      },
    });

    await prisma.payment.create({
      data: {
        PaymentAmount: parseFloat(faker.finance.amount({ min: 1200, max: 8000 })),
        PaymentStatus: i % 2 === 0 ? Status.COMPLETED : Status.PROCESSING,
        PaymentMode: Mode.ONLINE,
        PaymentDescription: `PO settlement for ${prov.ProviderName}`,
        OrderID: order.OrderID,
        companyId: apexCompany.companyId,
      },
    });
  }

  // Starlight Orders & Payments
  for (let i = 0; i < 3; i++) {
    const prov = starProviders[i % starProviders.length];
    const order = await prisma.order.create({
      data: {
        OrderDate: faker.date.recent({ days: 8 }),
        ProviderID: prov.ProviderID,
        companyId: starlightCompany.companyId,
      },
    });

    const chosenProd = starProducts[i % starProducts.length];
    await prisma.orderdetail.create({
      data: {
        OrderQuantity: faker.number.int({ min: 30, max: 150 }),
        ExpectedDate: faker.date.soon({ days: 5 }),
        ActualDate: faker.date.recent({ days: 1 }),
        ProductIDs: [chosenProd.ProductID],
        OrderID: order.OrderID,
      },
    });

    await prisma.payment.create({
      data: {
        PaymentAmount: parseFloat(faker.finance.amount({ min: 2500, max: 12000 })),
        PaymentStatus: Status.COMPLETED,
        PaymentMode: Mode.ONLINE,
        PaymentDescription: `Component order settlement for ${prov.ProviderName}`,
        OrderID: order.OrderID,
        companyId: starlightCompany.companyId,
      },
    });
  }

  console.log("Seeding deliveries...");
  for (let i = 0; i < 4; i++) {
    const cust = apexCustomers[i % apexCustomers.length];
    const delivery = await prisma.delivery.create({
      data: {
        SalesDate: faker.date.recent({ days: 6 }),
        CustomerID: cust.CustomerID,
        companyId: apexCompany.companyId,
      },
    });

    const chosenProd = apexProducts[i % apexProducts.length];
    await prisma.deliveryDetail.create({
      data: {
        DeliveryQuantity: faker.number.int({ min: 2, max: 15 }),
        ExpectedDate: faker.date.soon({ days: 3 }),
        ActualDate: i % 2 === 0 ? faker.date.recent({ days: 1 }) : null,
        ProductID: chosenProd.ProductID,
        DeliveryID: delivery.DeliveryID,
      },
    });
  }

  for (let i = 0; i < 3; i++) {
    const cust = starCustomers[i % starCustomers.length];
    const delivery = await prisma.delivery.create({
      data: {
        SalesDate: faker.date.recent({ days: 5 }),
        CustomerID: cust.CustomerID,
        companyId: starlightCompany.companyId,
      },
    });

    const chosenProd = starProducts[i % starProducts.length];
    await prisma.deliveryDetail.create({
      data: {
        DeliveryQuantity: faker.number.int({ min: 1, max: 5 }),
        ExpectedDate: faker.date.soon({ days: 2 }),
        ActualDate: faker.date.recent({ days: 1 }),
        ProductID: chosenProd.ProductID,
        DeliveryID: delivery.DeliveryID,
      },
    });
  }

  console.log("Seeding inter-warehouse transfers...");
  await prisma.transfer.create({
    data: {
      TransferQuantity: 25,
      SentDate: faker.date.recent({ days: 4 }),
      RecievedDate: faker.date.recent({ days: 1 }),
      ProductID: apexProducts[0].ProductID,
      OutWarehouseID: apexWh1.WarehouseID,
      InWarehouseID: apexWh2.WarehouseID,
      companyId: apexCompany.companyId,
    },
  });

  await prisma.transfer.create({
    data: {
      TransferQuantity: 15,
      SentDate: faker.date.recent({ days: 3 }),
      RecievedDate: null,
      ProductID: starProducts[0].ProductID,
      OutWarehouseID: starWh1.WarehouseID,
      InWarehouseID: starWh2.WarehouseID,
      companyId: starlightCompany.companyId,
    },
  });

  console.log("Seeding audit transactions...");
  await prisma.transaction.create({
    data: {
      TransactionDetail: "Initial bulk inventory load for Seattle Mega Hub",
      UserID: apexAdmin.userId,
      companyId: apexCompany.companyId,
    },
  });

  await prisma.transaction.create({
    data: {
      TransactionDetail: "Setup of Silicon Valley Tech Gateway and initial smart stock intake",
      UserID: starlightAdmin.userId,
      companyId: starlightCompany.companyId,
    },
  });

  console.log("Multi-tenancy sample data seeded successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });