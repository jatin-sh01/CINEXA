import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import constants from "../utils/constants.js";

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
      enum: Object.values(constants.USER_ROLE),
      default: constants.USER_ROLE.customer,
    },
    userStatus: {
      type: String,
      required: true,
      enum: Object.values(constants.USER_STATUS),
      default: constants.USER_STATUS.approved,
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
