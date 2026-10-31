import { Request, Response, NextFunction } from "express";
import { z, ZodSchema } from "zod";

/**
 * Middleware factory that validates req.body against a provided Zod schema.
 * Responds with 400 Bad Request and friendly validation error details if invalid.
 */
export const validateBody = (schema: ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: "Validation failed",
        details: result.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    req.body = result.data;
    next();
  };
};

/**
 * Middleware factory for req.query validation.
 */
export const validateQuery = (schema: ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: "Query validation failed",
        details: result.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    req.query = result.data;
    next();
  };
};

/**
 * Middleware factory for req.params validation.
 */
export const validateParams = (schema: ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.params);
    if (!result.success) {
      return res.status(400).json({
        error: "Parameters validation failed",
        details: result.error.errors.map((e) => ({
          field: e.path.join("."),
          message: e.message,
        })),
      });
    }
    req.params = result.data;
    next();
  };
};

/**
 * Login validation schema.
 * Supports both { credentials: { userEmail, userPassword } } (NextAuth client)
 * and { userEmail, userPassword } (direct API / REST client).
 */
export const loginSchema = z.union([
  z.object({
    credentials: z.object({
      userEmail: z.string().email("A valid email address is required"),
      userPassword: z.string().min(1, "Password is required"),
    }),
  }),
  z.object({
    userEmail: z.string().email("A valid email address is required"),
    userPassword: z.string().min(1, "Password is required"),
  }),
]);

/**
 * Registration and user provisioning validation schema.
 * Requires userEmail, userName, and password (minimum 8 characters as per SEC-15).
 */
export const registerSchema = z.object({
  userEmail: z.string().email("A valid email address is required"),
  userName: z.string().min(1, "User name is required"),
  userPassword: z.string().min(8, "Password must be at least 8 characters long"),
  userRole: z.enum(["SUPERADMIN", "ADMIN", "MANAGER", "EMPLOYEE"]).optional(),
  companyId: z.string().optional().nullable(),
  companyGroupId: z.string().optional().nullable(),
});

/**
 * Enterprise SSO Just-In-Time (JIT) provisioning schema.
 * Validates enterprise profile claims including email, name, provider, groups, and corporateDomain.
 */
export const ssoProvisionSchema = z.object({
  email: z.string().email("A valid corporate email address is required"),
  name: z.string().optional(),
  provider: z.string().optional(),
  providerAccountId: z.string().optional(),
  groups: z.union([z.array(z.string()), z.string().transform((val) => [val])]).optional(),
  corporateDomain: z.string().optional(),
});

/**
 * Payment creation validation schema.
 * Guarantees PaymentAmount is a non-negative number to prevent negative value injections.
 */
export const paymentSchema = z.object({
  PaymentAmount: z.coerce
    .number({ invalid_type_error: "Payment amount must be a number" })
    .min(0, "Payment amount must be greater than or equal to 0"),
  PaymentMode: z.enum(["ONLINE", "OFFLINE", "CHEQUE"]).optional().nullable(),
  PaymentDescription: z.string().optional().nullable(),
  PaymentStatus: z
    .enum(["INITIATED", "PROCESSING", "COMPLETED", "CANCELLED", "PENDING_APPROVAL"])
    .optional()
    .nullable(),
  OrderID: z.string().optional().nullable(),
  DeliveryID: z.string().optional().nullable(),
  DeileveryID: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
});

/**
 * Payment update validation schema.
 */
export const paymentUpdateSchema = z.object({
  PaymentID: z.string().optional(),
  PaymentAmount: z.coerce
    .number({ invalid_type_error: "Payment amount must be a number" })
    .min(0, "Payment amount must be greater than or equal to 0")
    .optional(),
  PaymentMode: z.enum(["ONLINE", "OFFLINE", "CHEQUE"]).optional().nullable(),
  PaymentDescription: z.string().optional().nullable(),
  PaymentStatus: z
    .enum(["INITIATED", "PROCESSING", "COMPLETED", "CANCELLED", "PENDING_APPROVAL"])
    .optional()
    .nullable(),
  OrderID: z.string().optional().nullable(),
  DeliveryID: z.string().optional().nullable(),
  DeileveryID: z.string().optional().nullable(),
  companyId: z.string().optional().nullable(),
});
