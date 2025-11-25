import express from "express";
import Visit from "../models/Visit.js";
import userAgent from "user-agent-parser";
import { Resend } from "resend";
import User from "../models/User.js";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();
const resend = new Resend(process.env.RESEND_API_KEY);
const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { headers, body } = req;
    const { projectName, id, page, referrer } = body;
    const agent = userAgent(headers["user-agent"]);

    const ip =
      headers["x-forwarded-for"]?.split(",")[0] ||
      req.socket.remoteAddress ||
      "127.0.0.1";

    let country = "Unknown";
    try {
      const response = await axios.get(`https://ipapi.co/${ip}/json/`);
      country = response.data.country_name || "Unknown";
    } catch (error) {
      console.error("Error fetching country:", error);
    }

    const visitData = {
      ip: ip,
      browser: agent.browser.name || "Unknown",
      platform: agent.os.name || "Unknown",
      page: page || "Unknown",
      referrer: referrer || "Unknown",
      country: country,
    };
    const visitDocument = await Visit.findOne({
      projectName,
      _id: id,
    }).populate("creator", "email");
    if (!visitDocument) {
      return res.status(400).json({ error: "Wrong website url" });
    }
    visitDocument.visit.push(visitData);
    const savedVisit = visitDocument.visit[visitDocument.visit.length - 1];
    await visitDocument.save();
    if (visitDocument.visit.length === parseInt(visitDocument.goal, 10)) {
      const creatorEmail = visitDocument.creator.email;
      if (!creatorEmail) {
        console.error("Creator email not found");
        return;
      }
      (async function () {
        const { data, error } = await resend.emails.send({
          from: "Tracking App <no-reply@startgrid.xyz>",
          to: [creatorEmail],
          subject: "Goal reached",
          html: `
             <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
            <h1 style="color: #8b5cf6; text-align: center;">Goal reached</h1>
            <p style="font-size: 16px; color: #333;">Hello ${creatorEmail},</p>
            <p style="font-size: 16px; color: #333;">Your goal of ${visitDocument.goal} visits has been reached. Congratulations!</p>
            <p style="font-size: 16px; color: #333;">You can now see the results in your dashboard.</p>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.WEBSITE_URL}/dashboard/projects/${visitDocument._id}" style="text-decoration: none; padding: 10px 20px; background-color: #8b5cf6; color: #fff; border-radius: 4px;" target="_blank">Dashboard</a>
            </div>
          </div>
          `,
        });
        if (error) {
          return console.error({ error });
        }
        console.log({ data });
      })();
    }
    res
      .status(201)
      .json({ message: "Visit logged successfully!", visitId: savedVisit._id });
  } catch (error) {
    console.error("Error logging visit:", error);
    res.status(500).json({ error: "Error logging visit" });
  }
});

export default router;
