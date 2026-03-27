import mongoose, { Schema, Document } from 'mongoose';

export type DeliveryZoneCenter = {
  latitude: number;
  longitude: number;
};

export interface IDeliveryZone extends Document {
  key: string;
  name: string;
  active: boolean;
  city: string;
  state: string;
  pincodes: string[];
  center: DeliveryZoneCenter;
  radiusMeters: number;
  createdAt: Date;
  updatedAt: Date;
}

const DeliveryZoneSchema = new Schema<IDeliveryZone>(
  {
    key: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincodes: { type: [String], default: [], index: true },
    center: {
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
    },
    radiusMeters: { type: Number, required: true, min: 50, max: 250000 },
  },
  { timestamps: true }
);

DeliveryZoneSchema.index({ active: 1 });
DeliveryZoneSchema.index({ key: 1 }, { unique: true });

export default mongoose.model<IDeliveryZone>('DeliveryZone', DeliveryZoneSchema);

