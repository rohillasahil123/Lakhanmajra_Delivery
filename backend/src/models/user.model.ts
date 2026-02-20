import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  village: string;
  password: string;
  roleId: Types.ObjectId; // reference to Role
  isActive: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true  , lowercase: true  },
    phone: { type: String , required: true },
    village: { type: String, default: "LakhanMajra" },
    password: { type: String, required: true },
    roleId: {
      type: Schema.Types.ObjectId,
      ref: "Role",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

UserSchema.index({ roleId: 1 });

export default mongoose.model<IUser>("User", UserSchema);
