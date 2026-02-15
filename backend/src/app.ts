import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mongoSanitize from "express-mongo-sanitize";
import hpp from "hpp";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import adminRoutes from "./routes/admin.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes"; // NEW - Order routes
import { errorHandler } from "./middlewares/error.middleware";
import { apiLimiter } from "./middlewares/rateLimiter.middleware";
import { connectRabbitMQ } from "./config/rabbitmq"; // NEW - RabbitMQ import

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(mongoSanitize());
app.use(hpp());

// Compression
app.use(compression());

// CORS
// Allow multiple frontend origins (mobile / web admin). Set FRONTEND_URLS in .env as comma-separated values.
const allowedOrigins = (process.env.FRONTEND_URLS || "http://localhost:3000,http://localhost:5173").split(",");
app.use(
  cors({
    origin: (origin, callback) => {
      // allow non-browser requests like curl/postman (no origin)
      if (!origin) return callback(null, true);
      if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
      return callback(new Error('CORS not allowed for origin: ' + origin));
    },
    credentials: true,
  })
);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
// Apply rate limiter to all /api/ routes except /api/auth/login
app.use("/api/", (req, res, next) => {
  if (req.path === "/auth/login") return next();
  return apiLimiter(req, res, next);
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Mongo error:", err));

// RabbitMQ Connection - NEW
connectRabbitMQ()
  .then(() => console.log("✅ RabbitMQ connected"))
  .catch((err) => console.error("❌ RabbitMQ error:", err));

// Routes
app.get("/", (_req, res) => {
  res.json({ message: "Backend running fine 🟢" });
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes); // NEW - Order routes

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Error handler (should be last middleware)
app.use(errorHandler);

export default app;