import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import mongoose from "mongoose";

import authRoutes from "./routes/auth.routes";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import offerRoutes from "./routes/offer.routes";
import adminRoutes from "./routes/admin.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";
import riderRoutes from "./routes/rider.routes";

import { apiLimiter } from "./middlewares/rateLimiter.middleware";
import { connectRabbitMQ } from "./config/rabbitmq";
import { initMinio } from "./services/minio.service";

const app: Application = express();

/* =========================================================
   🔐 TRUST PROXY (REQUIRED FOR PRODUCTION BEHIND NGINX/CDN)
========================================================= */
app.set("trust proxy", 1);

/* =========================================================
   🛡 SECURITY MIDDLEWARE
========================================================= */
app.use(helmet());
app.use(hpp());

/* =========================================================
   🚀 PERFORMANCE
========================================================= */
app.use(compression());

/* =========================================================
   🌍 CORS CONFIGURATION (STRICT & PRODUCTION SAFE)
========================================================= */
const allowedOrigins = (
  process.env.FRONTEND_URLS ||
  "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175"
)
  .split(",")
  .map((url) => url.trim());

console.log("✅ Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true); // allow server-to-server or Postman

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed for this origin"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  })
);

/* =========================================================
   📦 BODY PARSING
========================================================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

/* =========================================================
   📡 DATABASE CONNECTION
========================================================= */
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ Mongo error:", err);
    process.exit(1);
  });

/* =========================================================
   📬 RABBITMQ CONNECTION
========================================================= */
connectRabbitMQ()
  .then(() => console.log("✅ RabbitMQ connected"))
  .catch((err) => {
    console.error("❌ RabbitMQ error:", err);
    process.exit(1);
  });

/* =========================================================
   🗂 MINIO CONNECTION
========================================================= */
initMinio()
  .then(() => console.log("✅ MinIO ready"))
  .catch((err) => {
    console.error("❌ MinIO error:", err);
    process.exit(1);
  });

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
app.use("/api/admin", adminRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/rider", riderRoutes);

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
app.use(
  (err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("❌ Error:", err);

    const status = err?.status || err?.statusCode || 500;

    const message =
      process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err?.message || "Internal Server Error";

    res.status(status).json({
      success: false,
      message,
    });
  }
);

export default app;