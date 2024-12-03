import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import cors from "cors";

import authRoutes from "./routes/auth.js";
import createProjectRoutes from "./routes/create-project.js";
import dashboardRoutes from "./routes/dashboard.js";
import settingsRoutes from "./routes/settings.js";
import trackRoutes from "./routes/track.js";

dotenv.config();

const app = express();

// app.use(
//   cors({
//     origin: ["http://localhost:3000", "https://pixel-track.vercel.app"],
//     credentials: true,
//   })
// );

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/api/auth", authRoutes);
app.use("/api/create", createProjectRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/track", trackRoutes);

if (process.env.NODE_ENV !== "production") {
  app.listen(8000, () => {
    console.log("Server is running on port 8000");
    connectDB();
  });
}

if (process.env.NODE_ENV === "production") {
  connectDB();
}
export default app;
