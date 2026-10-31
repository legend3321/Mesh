import { Request, Response, NextFunction } from "express";

/**
 * Strips potentially sensitive database connection strings, credentials, or internal driver state
 * from an error message before it is sent to the client.
 */
function sanitizeErrorMessage(message: string): string {
  if (!message) return "An unexpected internal server error occurred";

  // Check for MongoDB connection URIs, credentials, replica sets, or hostnames
  if (
    message.includes("mongodb://") ||
    message.includes("mongodb+srv://") ||
    message.includes("replicaSet") ||
    message.includes("directConnection") ||
    message.includes("MongoServerSelectionError") ||
    message.includes("PrismaClientInitializationError") ||
    message.includes("PrismaClientRustPanicError")
  ) {
    return "Database connection error. Please contact system administrator.";
  }

  // Check for Prisma raw query details / column leaking
  if (message.includes("Invalid `prisma.") || message.includes("invocation:\n\n")) {
    return "A database operation error occurred.";
  }

  return message;
}

/**
 * Centralized safe error handler middleware.
 * Placed after all routes in index.ts to catch any unhandled exceptions or next(err) invocations.
 */
export const safeErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Always log full error stack traces on the server for debugging
  console.error(`[Unhandled Error] ${req.method} ${req.originalUrl || req.url}:`, err);

  if (res.headersSent) {
    return next(err);
  }

  const statusCode =
    typeof err?.statusCode === "number"
      ? err.statusCode
      : typeof err?.status === "number"
      ? err.status
      : 500;

  const isProduction = process.env.NODE_ENV === "production";

  let clientMessage = "An unexpected internal server error occurred";

  if (!isProduction) {
    // In dev / staging, provide sanitized readable message (no raw replica set/credential leak)
    clientMessage = sanitizeErrorMessage(err?.message || "An unexpected error occurred");
  } else {
    // In production, mask all 5xx internal errors
    if (statusCode < 500 && err?.message) {
      clientMessage = sanitizeErrorMessage(err.message);
    }
  }

  return res.status(statusCode).json({
    error: clientMessage,
  });
};

/**
 * Controller helper to safely log and respond to catch-block errors,
 * avoiding direct reflection of raw database exception objects to clients.
 */
export const handleError = (
  res: Response,
  error: any,
  defaultMessage: string = "An unexpected internal server error occurred",
  statusCode: number = 500
) => {
  console.error(`[Controller Error] ${defaultMessage}:`, error);

  const isProduction = process.env.NODE_ENV === "production";
  let clientMessage = defaultMessage;

  if (!isProduction && error?.message) {
    clientMessage = sanitizeErrorMessage(error.message);
  }

  return res.status(statusCode).json({
    error: clientMessage,
  });
};
