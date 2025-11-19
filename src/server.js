import express from "express";
import cors from "cors";
import { ENV } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { clerkMiddleware } from "@clerk/express";
import path from "path";
import { fileURLToPath } from "url";
import { runAutoSyncOnStartup } from "./startup/auto-sync.js"; 

// ROUTING
import userRoutes from "./routes/users.route.js";
import statRoutes from "./routes/stats.route.js";
import gameRoutes from "./routes/game.route.js";
import drillSessionRouter from "./routes/drill-session.route.js";
import drillsRouter from "./routes/drills.route.js";
import practiceRoutes from "./routes/practice.route.js";

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.set("view engine", "hbs");
app.set("views", __dirname);

app.use(cors());
app.use(express.json());
app.use(clerkMiddleware());

app.use("/api/users", userRoutes);
app.use("/api/stats", statRoutes);
app.use("/api/game", gameRoutes);
app.use("/api/practice", practiceRoutes);
app.use("/api/practice/drill-sessions", drillSessionRouter);
app.use("/api/practice/drills", drillsRouter);

const startServer = async () => {
  try {
    await connectDB();

    //  Run auto-sync once the DB connection is established
    await runAutoSyncOnStartup();

    if (ENV.NODE_ENV !== "production") {
      app.listen(ENV.PORT, () =>
        console.log("Server is up and running on PORT:", ENV.PORT)
      );
    }
    else{
      app.listen(ENV.PORT, () => {
        console.log(`Server is up and running on PORT: ${ENV.PORT}`);
      })
    }
  } catch (e) {
    console.error("Failed to start server:", e.message);
    process.exit(1);
  }
};

startServer();
export default app;