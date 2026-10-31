import { rateLimit } from "express-rate-limit";

/**
 * Strict rate limiter for authentication endpoints (/api/auth/login, /api/auth/register).
 * Protects against brute-force password guessing and credential stuffing attacks.
 * Limit: 20 requests per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 20, // max 20 requests per 15 minutes
  standardHeaders: true, // Return standard rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    error: "Too many authentication attempts from this IP, please try again after 15 minutes.",
  },
  statusCode: 429,
});

/**
 * Throttler for Enterprise SSO Just-In-Time (JIT) user provisioning (/api/auth/sso/provision).
 * Accommodates corporate NAT gateway traffic while protecting against automated account enumeration.
 * Limit: 100 requests per 15 minutes per IP.
 */
export const ssoLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100, // max 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many SSO provisioning attempts from this IP, please try again after 15 minutes.",
  },
  statusCode: 429,
});

/**
 * Throttler for AI & ML automated purchase order generation (/api/forecast/auto-po).
 * Protects against resource exhaustion and runaway automated order creation.
 * Limit: 10 requests per minute per IP.
 */
export const forecastLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  limit: 10, // max 10 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many automated purchase order requests, please try again after a minute.",
  },
  statusCode: 429,
});

/**
 * Standard global rate limiter for general API routes (/api/).
 * Protects backend services against DoS flooding and scraping.
 * Limit: 300 requests per 15 minutes per IP.
 */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 300, // max 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests from this IP, please try again after 15 minutes.",
  },
  statusCode: 429,
});
