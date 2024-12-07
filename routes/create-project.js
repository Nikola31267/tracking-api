import express from "express";
import Visit from "../models/Visit.js";
import { verifyToken } from "../middleware/auth.js";
import crypto from "crypto";
import axios from "axios";
import { load } from "cheerio";

const router = express.Router();

router.post("/", verifyToken, async (req, res) => {
  const { projectName } = req.body;
  const websiteUrl = `https://${projectName}`;

  try {
    const randomName = `pt_${crypto.randomBytes(14).toString("hex")}`;
    //const randomName = crypto.randomBytes(16).toString("hex");

    if (!projectName) {
      return res.status(400).json({ message: "Project name is required" });
    }

    let faviconUrl = null;

    if (websiteUrl) {
      try {
        const response = await axios.get(websiteUrl);

        const $ = load(response.data);

        const faviconLink =
          $('link[rel="icon"]').attr("href") ||
          $('link[rel="shortcut icon"]').attr("href") ||
          $('link[rel="apple-touch-icon"]').attr("href");

        if (faviconLink) {
          faviconUrl = new URL(faviconLink, websiteUrl).href;
        }
      } catch (error) {
        console.error("Error fetching favicon:", error.message);
      }
    }

    const newProject = new Visit({
      key: randomName,
      projectName,
      creator: req.user.id,
      addedSnippet: false,
      logo: faviconUrl,
    });

    await newProject.save();
    res.status(201).json(newProject);
  } catch (error) {
    console.error("Error creating project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const project = await Visit.findById(id);

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    project.addedSnippet = true;
    await project.save();

    res.status(200).json(project);
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
