import * as dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

let validatedSecret: string | null = null;

export const validateJwtSecret = (): string => {
  const secret = process.env.SALT || process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === "production";

  if (!secret) {
    if (isProduction) {
      throw new Error(
        "FATAL SECURITY CONFIGURATION ERROR: JWT Secret (process.env.SALT or process.env.JWT_SECRET) is missing in production!"
      );
    }
    const devFallback = crypto.randomBytes(32).toString("hex"); // 64-character hex string
    process.env.SALT = devFallback;
    process.env.JWT_SECRET = devFallback;
    validatedSecret = devFallback;
    console.warn(
      "\x1b[33m%s\x1b[0m",
      "[SECURITY WARNING] No SALT or JWT_SECRET provided. Assigned an ephemeral 64-character hex secret for development."
    );
    return devFallback;
  }

  if (secret.length < 32) {
    if (isProduction) {
      throw new Error(
        `FATAL SECURITY CONFIGURATION ERROR: JWT Secret (process.env.SALT or process.env.JWT_SECRET) must be at least 32 characters long in production (current length: ${secret.length}).`
      );
    }
    console.warn(
      "\x1b[33m%s\x1b[0m",
      `[SECURITY WARNING] JWT Secret is shorter than 32 characters (current: ${secret.length}). Please configure a 32+ character secret.`
    );
  }

  validatedSecret = secret;
  return secret;
};

export const getJwtSecret = (): string => {
  if (validatedSecret) {
    return validatedSecret;
  }
  return validateJwtSecret();
};
