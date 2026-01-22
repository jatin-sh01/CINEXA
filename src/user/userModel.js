import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please fill a valid email",
      ],
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minLength: 8,
    },
    userRole: {
      type: String,
      required: true,
      default: "CUSTOMER",
    },
    userStatus: {
      type: String,
      required: true,
      default: "APPROVED",
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return; // Skip if password unchanged
  this.password = await bcrypt.hash(this.password, 10);
});

const userModel = mongoose.model("User", userSchema);
export default userModel;
