import { Schema, model, Document, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  slug: string;
  description?: string;
  images: string[];
  categoryId: Types.ObjectId;
  subcategoryId?: Types.ObjectId | null;
  price: number;
  mrp?: number;
  stock: number;
  tags: string[];
  isActive: boolean;
  isDeleted: boolean;
}

const productSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
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
    subcategoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    price: {
      type: Number,
      required: true,
      default: 0,
    },
    mrp: {
      type: Number,
      default: 0,
    },
    stock: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Text index for search
productSchema.index({ name: "text", description: "text", tags: "text" });
productSchema.index({ slug: 1 }, { unique: true, sparse: true });
productSchema.index({ categoryId: 1 });

export const Product = model<IProduct>("Product", productSchema);
