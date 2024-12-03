import express from "express";
import Visit from "../models/Visit.js";

import cloudinary from "../config/cloudinary.js";
import bodyParser from "body-parser";
import { verifyToken } from "../middleware/auth.js";
const router = express.Router();

router.use(bodyParser.json({ limit: "50mb" }));

router.get("/projects", verifyToken, async (req, res) => {
  try {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const projects = await Visit.find({ creator: req.user.id });

    const totalRecentVisits = projects.reduce((total, project) => {
      const recentVisits = project.visit.filter(
        (visit) => visit.timestamp >= oneDayAgo
      );
      return total + recentVisits.length;
    }, 0);

    res.status(200).json({
      allProjects: projects,
      totalRecentVisits,
    });
  } catch (error) {
    console.error("Error fetching projects:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/projects/:id", verifyToken, async (req, res) => {
  try {
    const project = await Visit.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json(project);
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.delete("/projects/:id", verifyToken, async (req, res) => {
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

    await Visit.deleteOne({ _id: req.params.id });
    res
      .status(200)
      .json({ message: "Project and associated image deleted successfully" });
  } catch (error) {
    console.error("Error deleting project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/projects/:id", verifyToken, async (req, res) => {
  try {
    const visits = await Visit.findById(req.params.id);
    res.status(200).json(visits);
  } catch (error) {
    console.error("Error fetching visits:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/projects/:id/visits", verifyToken, async (req, res) => {
  try {
    const project = await Visit.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    res.status(200).json(project.visit);
  } catch (error) {
    console.error("Error fetching visits for project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/projects/:id/visits/:visitId", verifyToken, async (req, res) => {
  try {
    const project = await Visit.findById(req.params.id);
    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }
    const specificVisit = project.visit.id(req.params.visitId);
    if (!specificVisit) {
      return res.status(404).json({ message: "Visit not found" });
    }
    res.status(200).json(specificVisit);
  } catch (error) {
    console.error("Error fetching specific visit for project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/projectsByUsers", verifyToken, async (req, res) => {
  try {
    const visits = await Visit.find({ creator: req.user.id });
    res.status(200).json(visits);
  } catch (error) {
    console.error("Error fetching visits:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/projects/:id/updateProject", verifyToken, async (req, res) => {
  try {
    const project = await Api.findById(req.params.id);
    if (req.body.projectName) {
      project.projectName = req.body.projectName;
    }
    if (req.body.supportEmail) {
      project.supportEmail = req.body.supportEmail;
    }

    if (req.body.logo) {
      if (project.logo) {
        const publicId = project.logo
          .split("/")
          .slice(-2)
          .join("/")
          .split(".")[0];
        await cloudinary.uploader.destroy(publicId);
      }

      const uploadResponse = await cloudinary.uploader.upload(req.body.logo, {
        folder: "project_logos",
      });
      project.logo = uploadResponse.secure_url;
    }

    await project.save();
    res.status(200).json({ message: "Project updated successfully" });
  } catch (error) {
    console.error("Error updating project:", error);
    res.status(500).json({ message: "Server error" });
  }
});

router.put("/projects/:id/removeLogo", verifyToken, async (req, res) => {
  try {
    const project = await Api.findById(req.params.id);
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
    res.status(500).json({ message: "Server error" });
  }
});

router.delete(
  "/projects/:id/visits/:visitId/delete",
  verifyToken,
  async (req, res) => {
    try {
      const project = await Visit.findById(req.params.id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      const visitIndex = project.visit.findIndex(
        (visit) => visit._id.toString() === req.params.visitId
      );

      if (visitIndex === -1) {
        return res.status(404).json({ message: "Visit not found" });
      }

      project.visit.splice(visitIndex, 1);
      await project.save();

      res.status(200).json({ message: "Visit deleted successfully" });
    } catch (error) {
      console.error("Error deleting visit:", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
