import mongoose from "mongoose";
import {ENV} from "./env.js"

// creates a SQL connection using DB URL
let db;

export const connectDB = async () => {
  try {
    await mongoose.connect(ENV.DATABASE_URL);
    console.log("✅ MongoDB Connected");
    } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
};

export const getDB = () => db;