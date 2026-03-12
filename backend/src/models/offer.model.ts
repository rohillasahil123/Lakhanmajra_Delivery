import { Document, Schema, model } from "mongoose";

export interface IOffer extends Document {
  title: string;
  subtitle: string;
  cta: string;
  image: string;
  linkUrl: string;
  priority: number;
  isActive: boolean;
}

const offerSchema = new Schema<IOffer>(
  {
    title: {
      type: String,
      default: "",
      trim: true,
    },
    subtitle: {
      type: String,
      default: "",
      trim: true,
    },
    cta: {
      type: String,
      default: "",
      trim: true,
    },
    image: {
      type: String,
      required: true,
      trim: true,
    },
    linkUrl: {
      type: String,
      default: "",
      trim: true,
    },
    priority: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

offerSchema.index({ isActive: 1, priority: 1, createdAt: -1 });

export const Offer = model<IOffer>("Offer", offerSchema);
