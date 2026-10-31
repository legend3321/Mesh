import { Request, Response } from "express";
import { EdiGatewayService } from "../services/EdiGateway.service";
import { prisma } from "../db";

export const getTemplates = async (_req: Request, res: Response) => {
  try {
    const templates = EdiGatewayService.getTemplates();
    return res.status(200).json({
      success: true,
      templates,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message });
  }
};

export const parseEdi = async (req: Request, res: Response) => {
  try {
    const { rawEdi, type = "auto" } = req.body;
    if (!rawEdi || typeof rawEdi !== "string" || !rawEdi.trim()) {
      return res.status(400).json({ success: false, error: "rawEdi payload is required" });
    }

    const result = EdiGatewayService.parse(rawEdi, type);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to parse EDI payload" });
  }
};

export const generateEdi = async (req: Request, res: Response) => {
  try {
    const { type, id } = req.params;
    if (!type || !id) {
      return res.status(400).json({ success: false, error: "Both document type and entity ID are required" });
    }

    const standard = (req.query.standard as string) || "ANSI_X12";

    if (type !== "850" && type !== "856" && type !== "810") {
      return res.status(400).json({
        success: false,
        error: `Unsupported document type: ${type}. Supported types: 850, 856, 810`,
      });
    }

    let rawEdi = "";

    if (type === "850") {
      const order = await prisma.order.findUnique({
        where: { OrderID: id },
        include: { Provider: true, company: true, Orderdetail: { include: { Products: true } } },
      }).catch(() => null);

      if (order) {
        rawEdi = standard === "EDIFACT"
          ? EdiGatewayService.generateEdifactOrders(order as any)
          : EdiGatewayService.generateX12_850(order as any);
      } else {
        const templates = EdiGatewayService.getTemplates();
        rawEdi = templates["850"]?.ansiX12 || "";
      }
    } else if (type === "856") {
      const delivery = await prisma.delivery.findUnique({
        where: { DeliveryID: id },
        include: { Customer: true, company: true, DeliveryDetail: { include: { Product: true } } },
      }).catch(() => null);

      if (delivery) {
        rawEdi = standard === "EDIFACT"
          ? EdiGatewayService.generateEdifactDesadv(delivery as any)
          : EdiGatewayService.generateX12_856(delivery as any);
      } else {
        const templates = EdiGatewayService.getTemplates();
        rawEdi = templates["856"]?.ansiX12 || "";
      }
    } else if (type === "810") {
      const invoice = await prisma.vendorInvoice.findUnique({
        where: { InvoiceID: id },
        include: { Provider: true, company: true, items: { include: { Product: true } } },
      }).catch(() => null);

      if (invoice) {
        rawEdi = standard === "EDIFACT"
          ? EdiGatewayService.generateEdifactInvoic(invoice as any)
          : EdiGatewayService.generateX12_810(invoice as any);
      } else {
        const templates = EdiGatewayService.getTemplates();
        rawEdi = templates["810"]?.ansiX12 || "";
      }
    }

    return res.status(200).json({
      success: true,
      rawEdi,
      type,
      id,
      standard,
      generatedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error.message || "Failed to generate EDI" });
  }
};

export default {
  getTemplates,
  parseEdi,
  generateEdi,
};
