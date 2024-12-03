import express from "express";
import Visit from "../models/Visit.js";
import userAgent from "user-agent-parser";
import { Resend } from "resend";
import dotenv from "dotenv";
import geoip from "geoip-lite";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { headers, body } = req;
    const { apiKey, page } = body;
    const agent = userAgent(headers["user-agent"]);

    const geo = geoip.lookup(req.ip);
    const country = geo ? geo.country : "Unknown";

    const visitData = {
      ip: req.ip,
      device: agent.device.type || "Unknown",
      browser: agent.browser.name || "Unknown",
      platform: agent.os.name || "Unknown",
      page: page || "Unknown",
      referrer: req.headers.referer || "Direct",
      country: country,
    };

    const visitDocument = await Visit.findOne({ key: apiKey }).populate(
      "creator",
      "email"
    );

    if (!visitDocument) {
      return res.status(400).json({ error: "Wrong apiKey" });
    }

    visitDocument.visit.push(visitData);
    await visitDocument.save();

    if (visitDocument.visit.length === parseInt(visitDocument.goal, 10)) {
      const creatorEmail = visitDocument.creator.email;

      if (!creatorEmail) {
        console.error("Creator email not found");
        return;
      }

      (async function () {
        const { data, error } = await resend.emails.send({
          from: "PixelTrack <pixeltrack@builderbee.pro>",
          to: [creatorEmail],
          subject: "Goal reached",
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
              <h1 style="color: #1a73e8; text-align: center;">Hello!</h1>
              <p style="font-size: 16px; color: #333;">Congratulations! Your goal of ${
                visitDocument.goal
              } visits has been reached.</p>
              
              <p style="font-size: 14px; color: #888; text-align: center; margin-top: 20px;">
                &copy; ${new Date().getFullYear()} PixelTrack. All rights reserved.
              </p>
            </div>
          `,
        });

        if (error) {
          return console.error({ error });
        }

        console.log({ data });
      })();
    }

    res.status(201).json({ message: "Visit logged successfully!" });
  } catch (error) {
    console.error("Error logging visit:", error);
    res.status(500).json({ error: "Error logging visit" });
  }
});

export default router;
