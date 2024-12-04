import express from "express";
import User from "../models/User.js";
const router = express.Router();
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { verifyToken } from "../middleware/auth.js";
import axios from "axios";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import { Resend } from "resend";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

const resend = new Resend(process.env.RESEND_API_KEY);
const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.post("/register", async (req, res) => {
  const { username, email, fullName, password } = req.body;

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username,
      email,
      fullName,
      password: hashedPassword,
    });
    await newUser.save();
    jwt.sign(
      { id: newUser._id, email: newUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ token });
      }
    );
  } catch (error) {
    console.log(error);
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "User does not exist" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" },
      (err, token) => {
        if (err) throw err;
        res.status(200).json({ token });
      }
    );
  } catch (error) {
    console.log(error);
  }
});

router.post("/google-signin", async (req, res) => {
  const { token } = req.body;

  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");

  if (!token) {
    return res.status(400).json({ message: "Google token is required" });
  }

  try {
    const response = await axios.get(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${token}`
    );
    const { email, name: fullName, picture } = response.data;
    const profilePicture = picture;

    let userExists = await User.findOne({ email });

    let user;
    if (!userExists) {
      const newUser = new User({
        email,
        fullName,
        username: email,
        profilePicture,
        socialConnected: [
          {
            name: "Google",
            image:
              "https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png",
          },
        ],
      });
      await newUser.save();
      user = newUser;
    } else {
      user = userExists;
      const googleConnected = user.socialConnected.find(
        (social) => social.name === "Google"
      );

      if (!googleConnected) {
        user.socialConnected.push({
          name: "Google",
          image:
            "https://cdn1.iconfinder.com/data/icons/google-s-logo/150/Google_Icons-09-512.png",
        });
        await user.save();
      }
    }

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: "7d",
        issuer: "turboverify-token",
      }
    );

    res.status(200).json({
      message: "User signed in successfully",
      token: jwtToken,
    });
  } catch (error) {
    console.error("Error verifying Google token:", error);
    res
      .status(400)
      .json({ message: "Invalid Google token", error: error.message });
  }
});

router.get("/user", verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id);
  res.status(200).json(user);
});

router.put(
  "/updateProfile",
  verifyToken,
  upload.single("profilePicture"),
  async (req, res) => {
    try {
      const { username, email, fullName } = req.body;
      const user = await User.findById(req.user.id);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (username) {
        const existingUsername = await User.findOne({ username });
        if (
          existingUsername &&
          existingUsername._id.toString() !== user._id.toString()
        ) {
          return res.status(400).json({ message: "Username already exists" });
        }
      }

      if (email) {
        const existingEmail = await User.findOne({ email });
        if (
          existingEmail &&
          existingEmail._id.toString() !== user._id.toString()
        ) {
          return res.status(400).json({ message: "Email already exists" });
        }
      }

      if (req.file) {
        if (user.profilePicture) {
          const publicId = user.profilePicture
            .split("/")
            .slice(-1)[0]
            .split(".")[0];
          await cloudinary.uploader.destroy(`profile_pictures/${publicId}`);
        }

        const result = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { folder: "profile_pictures_website" },
              (error, result) => {
                if (error) return reject(error);
                resolve(result);
              }
            )
            .end(req.file.buffer);
        });

        user.profilePicture = result.secure_url;
      }

      if (username) user.username = username;
      if (email) user.email = email;
      if (fullName) user.fullName = fullName;

      await user.save();
      return res.status(200).json(user);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error", error: err.message });
    }
  }
);

router.put("/deleteProfilePicture", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.profilePicture) {
      const publicId = user.profilePicture
        .split("/")
        .slice(-1)[0]
        .split(".")[0];
      await cloudinary.uploader.destroy(`profile_pictures_website/${publicId}`);
      user.profilePicture = "";
    }

    await user.save();
    res.status(200).json({ message: "Profile picture deleted successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post("/magic-link", async (req, res) => {
  const { email } = req.body;

  try {
    const magicLinkToken = crypto.randomBytes(32).toString("hex");
    const magicLinkExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    let user = await User.findOne({ email });

    if (!user) {
      user = new User({
        email,
        username: email.split("@")[0],
        magicLinkToken,
        magicLinkExpiresAt,
      });
    } else {
      user.magicLinkToken = magicLinkToken;
      user.magicLinkExpiresAt = magicLinkExpiresAt;
    }

    await user.save();

    await (async function () {
      const { data, error } = await resend.emails.send({
        from: "PixelTrack <pixeltrack@builderbee.pro>",
        to: [email],
        subject: "Verify your email",
        html: `
          <div style="
            display: flex; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            background-color: white;
            padding: 16px; 
            font-family: sans-serif;
            text-align: center;
          ">
            <div style="
              width: 100%; 
              max-width: 400px; 
              background-color: #f9fafb;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
              border-radius: 8px; 
              padding: 16px;
              margin: auto;
            ">
              <div style="margin-bottom: 16px;">
                <div style="margin-bottom: 16px;">
                  <img 
                    src="https://res.cloudinary.com/dcxo5usnu/image/upload/v1733307852/logo-nobg_wizmwu.png" 
                    style="width: 64px; height: 64px; display: block; margin: 0 auto;" 
                    oncontextmenu="return false;" 
                    draggable="false"
                  />
                </div>
                <h1 style="font-size: 24px; font-weight: bold; color: #1f2937;">
                  Verify Your Email
                </h1>
              </div>
              <div style="margin-bottom: 26px;">
                <div style="
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  gap: 8px; 
                  color: #4F46E5; 
                  margin-bottom: 16px;
                ">
                  <span style="font-size: 18px; font-weight: 600;">
                    Email Verification
                  </span>
                </div>
                <p style="color: #374151;">
                  We've sent you a link to complete your sign up process. Simply click the button below to get started.
                </p>
                <div style="
                  background-color: #f9fafb; 
                  padding: 16px; 
                  border-radius: 8px; 
                  margin-top: 16px;
                  text-align: left;
                ">
                  <h2 style="font-size: 18px; font-weight: 600; color: #1f2937; margin-bottom: 8px;">
                    How It Works
                  </h2>
                  <ul style="
                    list-style-type: disc; 
                    padding-left: 20px; 
                    color: #374151; 
                    line-height: 1.5;
                  ">
                    <li>Click the button below</li>
                    <li>You'll be instantly signed in</li>
                    <li>Set up your profile and start using PixelTrack.</li>
                  </ul>
                </div>
              </div>
              <div style="display: flex; justify-content: center;">
                <a style="
                  width: 100%; 
                  padding: 12px; 
                  background-color: #4F46E5; 
                  color: white; 
                  font-size: 16px; 
                  font-weight: 600; 
                  border: none; 
                  border-radius: 4px; 
                  cursor: pointer; 
                  text-decoration: none;
                  text-align: center;
                  display: block;
                " href="http://localhost:3000/verify-magic-link?token=${magicLinkToken}">
                  Verify Email
                </a>
              </div>
              <div style="text-align: center; font-size: 14px; color: #9CA3AF; margin-top: 34px;">
                <p>This link will expire in 15 minutes for security reasons.</p>
                <p style="margin-top: 8px;">If you didn't request this, please ignore this email.</p>
              </div>
            </div>
          </div>
        `,
      });

      if (error) {
        return console.error({ error });
      }

      console.log({ data });
    })();

    res.status(200).json({
      message: "Magic link sent successfully. Please check your email.",
    });
  } catch (error) {
    console.error("Magic link error:", error);
    res.status(500).json({
      message: "Error sending magic link",
      error: error.message,
    });
  }
});

router.post("/verify-magic-link", async (req, res) => {
  const { token } = req.body;

  try {
    const user = await User.findOne({
      magicLinkToken: token,
      magicLinkExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        message: "Invalid or expired magic link",
      });
    }

    user.magicLinkToken = "";
    user.magicLinkExpiresAt = null;
    user.isEmailVerified = true;
    await user.save();

    const jwtToken = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(200).json({
      message: "Email verified successfully",
      token: jwtToken,
    });
  } catch (error) {
    console.error("Verification error:", error);
    res.status(500).json({
      message: "Error verifying magic link",
      error: error.message,
    });
  }
});

router.put("/disconnect-social", verifyToken, async (req, res) => {
  try {
    const { social } = req.body;

    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.socialConnected = user.socialConnected.filter(
      (connected) => connected.name !== social
    );
    await user.save();
    res.status(200).json({ message: "Social disconnected successfully" });
  } catch (error) {
    console.error("Error disconnecting social account:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

router.post("/reset-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetPasswordToken = crypto.randomBytes(32).toString("hex");
    const resetPasswordExpiresAt = new Date(Date.now() + 15 * 60 * 1000);

    user.resetPasswordToken = resetPasswordToken;
    user.resetPasswordExpiresAt = resetPasswordExpiresAt;
    await user.save();

    await (async function () {
      const { data, error } = await resend.emails.send({
        from: "PixelTrack <pixeltrack@builderbee.pro>",
        to: [email],
        subject: "Reset your password",
        html: `
          <div>
            <p>Click the link below to reset your password.</p>
            <a href="http://localhost:3000/reset-password?token=${resetPasswordToken}">Reset password</a>
          </div>
        `,
      });

      if (error) {
        return console.error({ error });
      }

      console.log({ data });
    })();
  } catch (error) {
    console.error("Error resetting password:", error);
  }
});

router.post("/verify-reset-password", async (req, res) => {
  const { token, password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiresAt: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.resetPasswordToken = "";
    user.resetPasswordExpiresAt = null;
    user.password = await bcrypt.hash(password, 10);
    await user.save();
    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("Error verifying reset password:", error);
  }
});

router.delete("/delete-account", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.deleteOne();
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("Error deleting account:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
