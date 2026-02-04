import express, { Application } from "express";
import cors from "cors";

import connectMongo from "./config/mongo.js";

const app: Application = express();

// middlewares
app.use(cors());
app.use(express.json());

// database
connectMongo();

// health route
app.get("/", (_req, res) => {
  res.json({
    status: "Backend running fine 🟢",
    env: process.env.NODE_ENV || "dev"
  });
});

export default app;
