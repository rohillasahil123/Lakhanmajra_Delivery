import { Schema, model, Document, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  description?: string;
  images: string[];
  categoryId: Types.ObjectId;
  isActive: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Product = model<IProduct>("Product", productSchema);
