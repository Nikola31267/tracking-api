import express from "express";
import { Resend } from "resend";
import Visit from "../models/Visit.js";
import dotenv from "dotenv";

dotenv.config();
const resend = new Resend(process.env.RESEND_API_KEY);
const router = express.Router();

router.post("/send", async (req, res) => {
  const { userEmail, title, description, projectName, id } = req.body;

  try {
    const visitDocument = await Visit.findOne({
      projectName,
      _id: id,
    }).populate("creator", "email");

    if (!visitDocument) {
      return res.status(400).json({ error: "Wrong website url" });
    }

    const creatorEmail = visitDocument.creator.email;
    if (!creatorEmail) {
      console.error("Creator email not found");
      return res.status(500).json({ error: "Creator email not found" });
    }

    visitDocument.issues.push({
      userEmail,
      title,
      description,
      state: "Not replied",
    });
    await visitDocument.save();

    const { data, error } = await resend.emails.send({
      from: "Pixel Track <pixeltrack@builderbee.pro>",
      to: [creatorEmail],
      subject: `Issue for ${projectName}`,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
            <h1 style="color: #8b5cf6; text-align: center;">${title}</h1>
            <p style="font-size: 16px; color: #333;">Hello ${creatorEmail},</p>
            <p style="font-size: 16px; color: #333;">You got an issue complaint from ${userEmail}</p>
            <p style="font-size: 16px; color: #333;">Issue:<br/>${description}</p>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.WEBSITE_URL}/dashboard/projects/${
        visitDocument._id
      }" 
                 style="text-decoration: none; padding: 10px 20px; background-color: #8b5cf6; color: #fff; border-radius: 4px;" target="_blank">
                 Dashboard
              </a>
            </div>
    
            <p style="font-size: 14px; color: #888; text-align: center; margin-top: 20px;">
              &copy; ${new Date().getFullYear()} Pixel Track. All rights reserved.
            </p>
          </div>`,
    });

    if (error) {
      console.error("Email sending failed", error);
      return res.status(500).json({ error: "Failed to send email" });
    }

    console.log("Email sent successfully:", data);
    res
      .status(200)
      .json({ message: "Issue reported and email sent successfully" });
  } catch (error) {
    console.error("Error handling /send request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/reply", async (req, res) => {
  const { userEmail, title, description, projectName, id, issueId } = req.body;

  try {
    const visitDocument = await Visit.findOne({
      projectName,
      _id: id,
    }).populate("creator", "email");

    if (!visitDocument) {
      return res.status(400).json({ error: "Wrong website url" });
    }

    const matchingIssue = visitDocument.issues.find(
      (issue) => issue.userEmail === userEmail
    );

    if (!matchingIssue) {
      return res.status(404).json({
        error: "No issue found reported by this email in the issues array.",
      });
    }

    const issueDocument = visitDocument.issues.find(
      (issue) => issue._id.toString() === issueId
    );

    if (!issueDocument) {
      return res.status(404).json({
        error: "No issue found with the provided issue ID.",
      });
    }

    if (issueDocument.state === "Replied") {
      return res.status(403).json({
        error: "You already replied to that issue",
      });
    }

    issueDocument.state = "Replied";

    await visitDocument.save();

    (async function () {
      const { data, error } = await resend.emails.send({
        from: "Pixel Track <pixeltrack@builderbee.pro>",
        to: [userEmail],
        subject: `Issue Complain Reply`,
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
              <h1 style="color: #8b5cf6; text-align: center;">${title}</h1>
              <p style="font-size: 16px; color: #333;">Hello ${userEmail},</p>
              <p style="font-size: 16px; color: #333;">You got a reply to your issue complain.</p>
              <p style="font-size: 16px; color: #333;">Reply:<br/>${description}</p>
      
              <p style="font-size: 14px; color: #888; text-align: center; margin-top: 20px;">
                &copy; ${new Date().getFullYear()} Pixel Track. All rights reserved.
              </p>
            </div>`,
      });
      if (error) {
        return console.error({ error });
      }
      console.log({ data });
    })();
    res.status(200).json({ message: "Issue report reply sent successfully" });
  } catch {
    console.error("Error handling /send request:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
