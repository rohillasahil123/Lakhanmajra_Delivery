import express, { Application } from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes";
import categoryRoutes from "./routes/category.routes";
import productRoutes from "./routes/product.routes";
import adminRoutes from "./routes/admin.routes";
import { errorHandler } from "./middlewares/error.middleware";

const app: Application = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI as string)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ Mongo error:", err));

 
app.get("/", (_req, res) => {
  res.json({ message: "Backend running fine 🟢" });
});

app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/products", productRoutes);
app.use("/api/admin", adminRoutes);

// Error handler (should be last middleware)
app.use(errorHandler);

export default app;
