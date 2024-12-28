import express from "express";
import connectDB from "./config/db.js";
import dotenv from "dotenv";
import cors from "cors";
import bodyParser from "body-parser";

import authRoutes from "./routes/auth.js";
import createProjectRoutes from "./routes/create-project.js";
import dashboardRoutes from "./routes/dashboard.js";
import settingsRoutes from "./routes/settings.js";
import trackRoutes from "./routes/track.js";
dotenv.config();

const app = express();

app.use(bodyParser.json());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const restrictedCorsOptions = {
  origin: [
    "http://localhost:3000",
    "https://pixel-track.vercel.app",
    "https://pixeltrack.startgrid.xyz",
  ],
  credentials: true,
};

const openCorsOptions = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  preflightContinue: false,
  optionsSuccessStatus: 204,
};

app.get("/", (req, res) => {
  res.redirect(process.env.WEBSITE_URL);
});

app.use("/api/create", cors(restrictedCorsOptions), createProjectRoutes);
app.use("/api/dashboard", cors(restrictedCorsOptions), dashboardRoutes);
app.use("/api/settings", cors(restrictedCorsOptions), settingsRoutes);
app.use("/api/auth", cors(restrictedCorsOptions), authRoutes);
app.use("/track", cors(openCorsOptions), trackRoutes);

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
