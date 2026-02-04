import express, { Application } from "express";
import cors from "cors";
import mongoose from "mongoose";
import authRoutes from "./routes/auth.routes";

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

app.get("/", (req, res) => {
  res.send("API running");
});

export default app;
