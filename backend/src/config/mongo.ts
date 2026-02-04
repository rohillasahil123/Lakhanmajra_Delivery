import mongoose from "mongoose";

const connectMongo = async (): Promise<void> => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ Mongo connection error:", error);
    process.exit(1);
  }
};

export default connectMongo;
