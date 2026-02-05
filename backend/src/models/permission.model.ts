import { Schema, model, Document } from "mongoose";

export interface IPermission extends Document {
  name: string; // e.g., "products:create", "orders:view"
  description: string;
  resource: string; // e.g., "products", "orders", "users"
  action: string; // e.g., "create", "read", "update", "delete"
  createdAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    resource: {
      type: String,
      required: true,
      trim: true,
    },
    action: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { timestamps: true }
);

permissionSchema.index({ resource: 1, action: 1 });

export const Permission = model<IPermission>("Permission", permissionSchema);
