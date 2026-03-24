import mongoose from "mongoose";
import { logInfo, logError } from "../utils/logger";

const connectMongo = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    logInfo("MongoDB connected");
  } catch (error) {
    logError("Mongo connection error", error);
    process.exit(1);
  }
};

export default connectMongo;
