import mongoose from "mongoose";

const visitSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  projectName: { type: String, required: true },
  logo: { type: String, default: null },
  visit: [
    {
      ip: String,
      device: String,
      browser: String,
      platform: String,
      timestamp: { type: Date, default: Date.now },
      referrer: String,
    },
  ],
  creator: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
});

const Visit = mongoose.model("Visit", visitSchema);
export default Visit;
