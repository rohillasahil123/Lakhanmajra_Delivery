import { Document, Schema, Types, model } from "mongoose";

export type NotificationAudience = "all" | "selected";

export interface INotification extends Document {
  title: string;
  body: string;
  audience: NotificationAudience;
  recipients: Types.ObjectId[];
  linkUrl: string;
  imageUrl: string;
  isActive: boolean;
  createdBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
      trim: true,
    },
    audience: {
      type: String,
      enum: ["all", "selected"],
      default: "all",
      index: true,
    },
    recipients: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    linkUrl: {
      type: String,
      default: "",
      trim: true,
    },
    imageUrl: {
      type: String,
      default: "",
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
  },
  { timestamps: true }
);

notificationSchema.index({ audience: 1, isActive: 1, createdAt: -1 });
notificationSchema.index({ recipients: 1, isActive: 1, createdAt: -1 });

export const Notification = model<INotification>("Notification", notificationSchema);
