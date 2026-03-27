import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.routes";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import offerRoutes from "./routes/offer.routes";
import notificationRoutes from "./routes/notification.routes";
import adminRoutes from "./routes/admin.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";
import riderRoutes from "./routes/rider.routes";
import webhookRoutes from "./routes/webhook.routes";
import deliveryZoneRoutes from "./routes/deliveryZone.routes";

import { apiLimiter } from "./middlewares/rateLimiter.middleware";
import verifyCsrfToken from "./middlewares/csrf.middleware";
import { loggingMiddleware } from "./middlewares/logging.middleware";
import { connectRabbitMQ } from "./config/rabbitmq";
import { initMinio } from "./services/minio.service";
import { logInfo, logError, logWarn } from "./utils/logger";

const app: Application = express();

/* =========================================================
   🔐 TRUST PROXY (REQUIRED FOR PRODUCTION BEHIND NGINX/CDN)
========================================================= */
app.set("trust proxy", 1);

/* =========================================================
   🛡 SECURITY MIDDLEWARE
========================================================= */
/**
 * SECURITY: Helmet.js configuration
 * - Sets various HTTP headers for security
 * - HSTS (HTTP Strict-Transport-Security) forces HTTPS in production
 * - CSP (Content-Security-Policy) prevents XSS attacks
 * - X-Frame-Options prevents clickjacking
 */
app.use(helmet({
  hsts: {
    maxAge: 31536000, // 1 year in seconds
    includeSubDomains: true,
    preload: true, // Allow preload to HSTS list
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));
app.use(hpp());

/* =========================================================
   🚀 PERFORMANCE
========================================================= */
app.use(compression());

/* =========================================================
   📝 REQUEST LOGGING MIDDLEWARE
========================================================= */
app.use(loggingMiddleware);

/* =========================================================
   🌍 CORS CONFIGURATION (STRICT & PRODUCTION SAFE)
========================================================= */
const allowedOrigins = (
  process.env.FRONTEND_URLS ||
  "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175"
)
  .split(",")
  .map((url) => url.trim());

logInfo("Allowed CORS origins configured", { origins: allowedOrigins });

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests without origin (server-to-server, Postman)
      if (!origin) return callback(null, true);

      // In development, allow all origins for easier collaboration
      if (process.env.NODE_ENV === "development") {
        // Silently allow in development - no console log spam
        return callback(null, true);
      }

      // Check if origin is in whitelist
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject unknown origins
      logWarn(`CORS blocked request from: ${origin}`, { allowedOrigins });
      return callback(new Error("CORS not allowed for this origin"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
    optionsSuccessStatus: 200,
  })
);

/* =========================================================
   📦 BODY PARSING
========================================================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser()); // Parse cookies for request.cookies access

/* =========================================================
   📡 DATABASE CONNECTION
========================================================= */
const bootstrapInfrastructure = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    logInfo("MongoDB connected");
  } catch (err) {
    logError("MongoDB connection failed", {}, err as Error);
    process.exit(1);
  }

/* =========================================================
   📬 RABBITMQ CONNECTION
========================================================= */
  try {
    await connectRabbitMQ();
    logInfo("RabbitMQ connected");
  } catch (err) {
    logError("RabbitMQ connection failed", {}, err as Error);
    process.exit(1);
  }

/* =========================================================
   🗂 MINIO CONNECTION
========================================================= */
  try {
    await initMinio();
    logInfo("MinIO initialized");
  } catch (err) {
    logError("MinIO initialization failed", {}, err as Error);
    process.exit(1);
  }
};

void bootstrapInfrastructure();

/* =========================================================
   ❤️ HEALTH CHECK
========================================================= */
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

/* =========================================================
   🟢 ROOT CHECK
========================================================= */
app.get("/", (_req: Request, res: Response) => {
  res.json({ message: "Backend running fine 🟢" });
});

/* =========================================================
   🚦 GLOBAL API RATE LIMITER
========================================================= */
app.use("/api", apiLimiter);

/* =========================================================
   📌 ROUTES
========================================================= */
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/offers", offerRoutes);
app.use("/api/notifications", notificationRoutes);

/**
 * CSRF Protection: Admin routes with state-changing operations
 * All POST, PUT, PATCH, DELETE requests must include valid CSRF token
 */
app.use("/api/admin", verifyCsrfToken, adminRoutes);

app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/delivery-zones", deliveryZoneRoutes);
app.use("/api/rider", riderRoutes);

/**
 * PAYMENT WEBHOOKS
 * No CSRF protection needed - external payment providers send webhooks
 * Signature verification is built into webhook handlers
 */
app.use("/api/webhooks", webhookRoutes);

/* =========================================================
   ❌ 404 HANDLER
========================================================= */
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* =========================================================
   ⚠ GLOBAL ERROR HANDLER
========================================================= */
/**
 * Global Error Handler
 * SECURITY: Different error responses for development vs production
 * - Production: Generic error messages to prevent info leakage
 * - Development: Detailed errors for debugging
 */
app.use(
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status || err?.statusCode || 500;
    const isDevelopment = process.env.NODE_ENV === "development";

    // Extract meaningful error information
    const errorMessage = err?.message || "Internal Server Error";
    const errorCode = err?.code || "UNKNOWN_ERROR";

    // Log detailed error using Winston logger
    logError(`${errorCode} - ${errorMessage}`, {
      status,
      method: _req.method,
      url: _req.url,
      userAgent: _req.get('User-Agent')?.slice(0, 50),
      ip: _req.ip,
      correlationId: (_req as any).correlationId,
    }, err);

    // Determine response message
    let message: string;
    if (isDevelopment) {
      // Development: Full error details for debugging
      message = errorMessage;
    } else {
      // Production: Safe, generic messages to prevent info leakage
      if (status === 400) message = "Invalid request. Please check your input.";
      else if (status === 401) message = "Unauthorized. Please authenticate.";
      else if (status === 403) message = "You don't have permission to access this resource.";
      else if (status === 404) message = "Resource not found.";
      else if (status === 409) message = "The operation conflicts with existing data.";
      else if (status >= 400 && status < 500) message = "Invalid request.";
      else if (status >= 500) message = "Server error. Please try again later.";
      else message = "An error occurred. Please try again.";
    }

    res.status(status).json({
      success: false,
      message,
      ...(isDevelopment && { errorCode, details: err?.details }),
    });
  }
);

export default app;