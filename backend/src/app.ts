import express, { Application } from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import hpp from "hpp";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import adminRoutes from "./routes/admin.routes";
import cartRoutes from "./routes/cart.routes";
import orderRoutes from "./routes/order.routes";
import { connectRabbitMQ } from "./config/rabbitmq";

const app: Application = express();

// Security middleware
app.use(helmet());
app.use(hpp());

// Compression
app.use(compression());

// CORS - More permissive for development
const allowedOrigins = (process.env.FRONTEND_URLS || "http://localhost:3000,http://localhost:5173,http://localhost:5174,http://localhost:5175").split(",").map(url => url.trim());

console.log("✅ Allowed Origins:", allowedOrigins);

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
  })
);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Mongo error:", err));

// RabbitMQ Connection
connectRabbitMQ()
  .then(() => console.log("✅ RabbitMQ connected"))
  .catch((err) => console.error("❌ RabbitMQ error:", err));

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Root endpoint
app.get("/", (_req, res) => {
  res.json({ message: "Backend running fine 🟢" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/orders", orderRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// Error handler
app.use((err: any, _req: any, res: any, _next: any) => {
  console.error("Error:", err);
  const status = err?.status || err?.statusCode || 500;
  const message = err?.message || "Internal Server Error";
  res.status(status).json({ success: false, message });
});

export default app;
