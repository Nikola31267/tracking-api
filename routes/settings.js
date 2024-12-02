import express from "express";
import cloudinary from "../config/cloudinary.js";
import Visit from "../models/Visit.js";
import { verifyToken } from "../middleware/auth.js";
import multer from "multer";

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.put("/:id", verifyToken, upload.single("logo"), async (req, res) => {
  try {
    const project = await Visit.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (req.body.projectName) {
      project.projectName = req.body.projectName;
    }
    if (req.body.goal) {
      project.goal = req.body.goal;
    }

    if (req.file) {
      if (project.logo) {
        const publicId = project.logo
          .split("/")
          .slice(-2)
          .join("/")
          .split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }

      const uploadResponse = await cloudinary.uploader.upload_stream(
        { folder: "project_logos" },
        (error, result) => {
          if (error) {
            console.error("Cloudinary upload error:", error);
            return res.status(500).json({ message: "Cloudinary upload error" });
          }
          project.logo = result.secure_url;
          project.save().then(() => {
            res.status(200).json({ message: "Project updated successfully" });
          });
        }
      );

      // Use the buffer from req.file to upload to Cloudinary
      uploadResponse.end(req.file.buffer);
    } else {
      await project.save();
      res.status(200).json({ message: "Project updated successfully" });
    }
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.delete("/:id", verifyToken, async (req, res) => {
  const project = await Visit.findById(req.params.id);
  if (!project) {
    return res.status(404).json({ message: "Project not found" });
  }

  if (project.logo) {
    const publicId = project.logo.split("/").slice(-2).join("/").split(".")[0];
    await cloudinary.uploader.destroy(publicId);
  }

  await Visit.deleteOne({ _id: req.params.id });
  res.status(200).json({ message: "Project deleted successfully" });
});

router.put("/:id/removeLogo", async (req, res) => {
  try {
    const project = await Visit.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    if (project.logo) {
      const publicId = project.logo
        .split("/")
        .slice(-2)
        .join("/")
        .split(".")[0];
      await cloudinary.uploader.destroy(publicId);
    }

    project.logo = null;
    await project.save();
    res.status(200).json({ message: "Logo removed successfully" });
  } catch (error) {
    console.error("Error removing logo:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

export default router;
