import rateLimit from "express-rate-limit";

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1200,
  message: "Too many requests from this IP, please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === "/health",
});

// Cart limiter
export const cartLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: "Too many cart operations, please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth limiter
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many authentication attempts. Please try again later.",
  standardHeaders: true,
  legacyHeaders: false,
});

// Rider location limiter
export const riderLocationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many location updates. Please slow down.",
  standardHeaders: true,
  legacyHeaders: false,
});