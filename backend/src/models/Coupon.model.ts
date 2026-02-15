import mongoose, { Schema, Document } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderValue: number;
  maxUsageCount?: number;
  usageCount: number;
  usedBy: mongoose.Types.ObjectId[];
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  applicableCategories?: mongoose.Types.ObjectId[];
  applicableProducts?: mongoose.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const couponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
    },
    discountType: {
      type: String,
      enum: {
        values: ['percentage', 'fixed'],
        message: '{VALUE} is not a valid discount type',
      },
      required: [true, 'Discount type is required'],
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [0, 'Discount value cannot be negative'],
    },
    maxDiscount: {
      type: Number,
      min: [0, 'Max discount cannot be negative'],
    },
    minOrderValue: {
      type: Number,
      required: [true, 'Minimum order value is required'],
      min: [0, 'Minimum order value cannot be negative'],
      default: 0,
    },
    maxUsageCount: {
      type: Number,
      min: [1, 'Max usage count must be at least 1'],
    },
    usageCount: {
      type: Number,
      default: 0,
      min: [0, 'Usage count cannot be negative'],
    },
    usedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    validFrom: {
      type: Date,
      required: [true, 'Valid from date is required'],
      default: Date.now,
    },
    validTo: {
      type: Date,
      required: [true, 'Valid to date is required'],
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    applicableCategories: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Category',
      },
    ],
    applicableProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Product',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes
couponSchema.index({ code: 1, isActive: 1 });
couponSchema.index({ validFrom: 1, validTo: 1 });

const Coupon = mongoose.model<ICoupon>('Coupon', couponSchema);

export default Coupon;