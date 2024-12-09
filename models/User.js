import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  username: { type: String },
  email: { type: String, required: true, unique: true },
  fullName: { type: String },
  password: { type: String },
  profilePicture: { type: String, default: "" },
  resetPasswordToken: { type: String, default: "" },
  resetPasswordExpiresAt: { type: Date, default: null },
  magicLinkToken: { type: String, default: "" },
  magicLinkExpiresAt: { type: Date, default: null },
  isEmailVerified: { type: Boolean, default: false },
  socialConnected: [
    {
      name: { type: String },
      image: { type: String },
    },
  ],
  hasAccess: { type: Boolean, default: false },
  priceId: { type: String, default: "" },
  customerId: { type: String, default: "" },
});

const User = mongoose.model("User", userSchema);

export default User;
