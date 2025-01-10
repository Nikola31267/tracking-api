import express from "express";
import { Resend } from "resend";
import Visit from "../models/Visit.js";
import dotenv from "dotenv";

dotenv.config();
const resend = new Resend(process.env.RESEND_API_KEY);
const router = express.Router();

router.post("/send", async (req, res) => {
  const { userEmail, title, description, projectName, id } = req.body;

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
    return;
  }

  (async function () {
    const { data, error } = await resend.emails.send({
      from: "Pixel Track <pixeltrack@builderbee.pro>",
      to: [creatorEmail],
      subject: title,
      html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
            <h1 style="color: #8b5cf6; text-align: center;">${title}</h1>
            <p style="font-size: 16px; color: #333;">Hello ${creatorEmail},</p>
            <p style="font-size: 16px; color: #333;">You got a issue complaint from ${userEmail}</p>
            <p style="font-size: 16px; color: #333;">Issue:<br/>${description}</p>
            
            <div style="text-align: center; margin-top: 20px;">
              <a href="${process.env.WEBSITE_URL}/dashboard/projects/${
        visitDocument._id
      }" style="text-decoration: none; padding: 10px 20px; background-color: #8b5cf6; color: #fff; border-radius: 4px;" target="_blank">Dashboard</a>
            </div>
    
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
});

router.post("/reply", async (req, res) => {
  const { userEmail, title, description, projectName, id } = req.body;

  const visitDocument = await Visit.findOne({
    projectName,
    _id: id,
  }).populate("creator", "email");

  if (!visitDocument) {
    return res.status(400).json({ error: "Wrong website url" });
  }

  (async function () {
    const { data, error } = await resend.emails.send({
      from: "Pixel Track <pixeltrack@builderbee.pro>",
      to: [userEmail],
      subject: title,
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
});

export default router;
