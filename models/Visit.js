import mongoose from "mongoose";

const visitSchema = new mongoose.Schema({
  projectName: { type: String, required: true },
  logo: { type: String, default: null },
  goal: { type: String, default: "" },
  visit: [
    {
      ip: String,
      device: String,
      browser: String,
      platform: String,
      page: String,
      timestamp: { type: Date, default: Date.now },
      referrer: String,
      country: String,
      issues: [
        {
          id: { type: mongoose.Schema.Types.ObjectId },
        },
      ],
    },
  ],
  addedSnippet: { type: Boolean, default: false },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const Visit = mongoose.model("Visit", visitSchema);
export default Visit;
