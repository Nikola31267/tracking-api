import express from "express";
import Visit from "../models/Visit.js";
import { verifyToken } from "../middleware/auth.js";
import crypto from "crypto";

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
  const { projectName } = req.body;

  try {
    const randomName = `pt_${crypto.randomBytes(14).toString("hex")}`;
    //const randomName = crypto.randomBytes(16).toString("hex");

    if (!projectName) {
      return res.status(400).json({ message: "Project name is required" });
    }

    const newProject = new Visit({
      key: randomName,
      projectName,
      creator: req.user.id,
    });

    await newProject.save();
    res.status(201).json(newProject);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
