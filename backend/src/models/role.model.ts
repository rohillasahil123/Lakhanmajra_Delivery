import { Schema, model, Document, Types } from "mongoose";

export interface IRole extends Document {
  name: string; // e.g., "superadmin", "admin", "manager", "vendor", "rider", "user"
  description: string;
  permissions: Types.ObjectId[]; // references to Permission documents
  isActive: boolean;
  createdAt: Date;
}

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    permissions: [
      {
        type: Schema.Types.ObjectId,
        ref: "Permission",
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Role = model<IRole>("Role", roleSchema);
