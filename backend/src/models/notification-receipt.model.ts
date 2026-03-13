import { Document, Schema, Types, model } from "mongoose";

export interface INotificationReceipt extends Document {
  notificationId: Types.ObjectId;
  userId: Types.ObjectId;
  isRead: boolean;
  readAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const notificationReceiptSchema = new Schema<INotificationReceipt>(
  {
    notificationId: {
      type: Schema.Types.ObjectId,
      ref: "Notification",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
    readAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

notificationReceiptSchema.index({ notificationId: 1, userId: 1 }, { unique: true });
notificationReceiptSchema.index({ userId: 1, isRead: 1, updatedAt: -1 });

export const NotificationReceipt = model<INotificationReceipt>(
  "NotificationReceipt",
  notificationReceiptSchema
);
