import mongoose, { Schema, Document, Types } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  village: string;
  address?: string;
  deliveryInstructions?: string;
  latitude?: number;
  longitude?: number;
  password: string;
  roleId: Types.ObjectId; // reference to Role
  isActive: boolean;
  isOnline: boolean;
  riderProfile?: {
    fullName: string;
    dateOfBirth: string;
    phoneNumber: string;
    otpCode: string;
    aadhaarNumber: string;
    aadhaarFrontImage: string;
    aadhaarBackImage: string;
    liveSelfieImage: string;
    dlNumber: string;
    dlExpiryDate: string;
    dlFrontImage: string;
    vehicleNumber: string;
    vehicleType: string;
    rcFrontImage: string;
    insuranceImage: string;
    accountHolderName: string;
    bankAccountNumber: string;
    ifscCode: string;
    cancelledChequeImage: string;
    policeVerificationDocument: string;
    emergencyContactName: string;
    emergencyContactNumber: string;
    updatedAt?: Date;
  };
  createdAt: Date;
}

const RiderProfileSchema = new Schema(
  {
    fullName: {type: String, default: ''},
    dateOfBirth: {type: String, default: ''},
    phoneNumber: {type: String, default: ''},
    otpCode: {type: String, default: ''},
    aadhaarNumber: {type: String, default: ''},
    aadhaarFrontImage: {type: String, default: ''},
    aadhaarBackImage: {type: String, default: ''},
    liveSelfieImage: {type: String, default: ''},
    dlNumber: {type: String, default: ''},
    dlExpiryDate: {type: String, default: ''},
    dlFrontImage: {type: String, default: ''},
    vehicleNumber: {type: String, default: ''},
    vehicleType: {type: String, default: ''},
    rcFrontImage: {type: String, default: ''},
    insuranceImage: {type: String, default: ''},
    accountHolderName: {type: String, default: ''},
    bankAccountNumber: {type: String, default: ''},
    ifscCode: {type: String, default: ''},
    cancelledChequeImage: {type: String, default: ''},
    policeVerificationDocument: {type: String, default: ''},
    emergencyContactName: {type: String, default: ''},
    emergencyContactNumber: {type: String, default: ''},
    updatedAt: {type: Date},
  },
  {_id: false}
);

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true  , lowercase: true  },
    phone: { type: String , required: true },
    village: { type: String, default: "LakhanMajra" },
    address: { type: String, default: "" },
    deliveryInstructions: { type: String, default: "" },
    latitude: { type: Number },
    longitude: { type: Number },
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
    isOnline: {
      type: Boolean,
      default: false,
    },
    riderProfile: {
      type: RiderProfileSchema,
      default: () => ({}),
    },
  },
  { timestamps: true }
);

UserSchema.index({ roleId: 1 });

export default mongoose.model<IUser>("User", UserSchema);
