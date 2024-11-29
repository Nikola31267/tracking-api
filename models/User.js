import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String },
  email: { type: String, required: true },
  fullName: { type: String },
  password: { type: String },
  profilePicture: { type: String, default: "" },
  resetPasswordToken: { type: String, default: "" },
  resetPasswordExpiresAt: { type: Date, default: null },
});

const User = mongoose.model("User", userSchema);

export default User;
