import {Request, Response} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {randomInt} from 'crypto';
import {Types} from 'mongoose';
import User from '../models/user.model';
import {Role} from '../models/role.model';
import Order from '../models/order.model';
import {Audit} from '../models/audit.model';
import { emitOrderRealtime } from '../services/realtime.service';
import { uploadToMinio } from '../services/minio.service';
import {createWorker} from 'tesseract.js';

type RiderFlowStatus = 'Assigned' | 'Accepted' | 'Picked' | 'OutForDelivery' | 'Delivered' | 'Rejected';

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

const getRoleName = (user: any): string => {
  const role = user?.role || user?.roleName || user?.roleId?.name || user?.roleId;
  return String(role || '').toLowerCase();
};

const backendToRiderFallback = (status: string): RiderFlowStatus => {
  if (status === 'processing' || status === 'pending') return 'Assigned';
  if (status === 'confirmed') return 'Accepted';
  if (status === 'shipped') return 'OutForDelivery';
  if (status === 'delivered') return 'Delivered';
  if (status === 'cancelled') return 'Rejected';
  return 'Assigned';
};

const currentRiderStatus = (order: any): RiderFlowStatus => {
  const backendStatus = String(order?.status || '').toLowerCase();

  if (backendStatus === 'delivered') {
    return 'Delivered';
  }

  if (backendStatus === 'cancelled') {
    return 'Rejected';
  }

  if (order?.riderStatus) {
    return order.riderStatus as RiderFlowStatus;
  }
  return backendToRiderFallback(String(order?.status || 'processing'));
};

const getOrderProductPreview = (order: any): {name: string; image: string} | null => {
  const firstItem = Array.isArray(order?.items) ? order.items[0] : null;
  const product = firstItem?.productId && typeof firstItem.productId === 'object' ? firstItem.productId : null;

  if (!product) {
    return null;
  }

  const image = Array.isArray(product.images) && product.images.length > 0 ? String(product.images[0]) : '';
  const name = product.name ? String(product.name) : 'Product';

  if (!image && !name) {
    return null;
  }

  return {name, image};
};

const normalizeRiderOrder = (orderDoc: any) => {
  const order = orderDoc?.toObject ? orderDoc.toObject() : orderDoc;
  const user = order?.userId && typeof order.userId === 'object' ? order.userId : null;
  const productPreview = getOrderProductPreview(order);
  const items = Array.isArray(order?.items)
    ? order.items.map((item: any) => {
        const product = item?.productId && typeof item.productId === 'object' ? item.productId : null;
        const quantity = Number(item?.quantity || 0);
        const price = Number(item?.price || 0);
        const image = Array.isArray(product?.images) && product.images.length > 0 ? String(product.images[0]) : '';

        return {
          productId: String(product?._id || item?.productId || ''),
          name: product?.name ? String(product.name) : 'Product',
          quantity,
          price,
          total: quantity * price,
          image,
        };
      })
    : [];

  return {
    id: String(order?._id || order?.id),
    riderId: String(order?.assignedRiderId || ''),
    status: currentRiderStatus(order),
    paymentType: order?.paymentMethod === 'online' ? 'PREPAID' : 'COD',
    amount: Number(order?.totalAmount || 0),
    items,
    customer: {
      name: user?.name || 'Customer',
      phone: user?.phone || '',
    },
    deliveryAddress: {
      line1: order?.shippingAddress?.street || '',
      city: order?.shippingAddress?.city || '',
      state: order?.shippingAddress?.state || '',
      postalCode: order?.shippingAddress?.pincode || '',
      latitude: typeof order?.shippingAddress?.latitude === 'number' ? order.shippingAddress.latitude : undefined,
      longitude: typeof order?.shippingAddress?.longitude === 'number' ? order.shippingAddress.longitude : undefined,
    },
    productPreview,
    assignedAt: new Date(order?.createdAt || Date.now()).toISOString(),
    updatedAt: new Date(order?.updatedAt || Date.now()).toISOString(),
  };
};

const allowedTransitions: Record<RiderFlowStatus, RiderFlowStatus[]> = {
  Assigned: ['Accepted', 'Rejected'],
  Accepted: ['Picked'],
  Picked: ['OutForDelivery'],
  OutForDelivery: ['Delivered'],
  Delivered: [],
  Rejected: [],
};

const LOCATION_REALTIME_EMIT_MIN_INTERVAL_MS = Number(
  process.env.LOCATION_REALTIME_EMIT_MIN_INTERVAL_MS || 10000
);
const PROFILE_OTP_TTL_MS = Number(process.env.RIDER_PROFILE_OTP_TTL_MS || 5 * 60 * 1000);
const riderLocationEmitCache = new Map<string, number>();
const riderProfileOtpStore = new Map<string, {otp: string; expiresAt: number}>();

const createProfileOtp = (): string => String(randomInt(100000, 1000000));

const toObjectIdOrNull = (value: string): Types.ObjectId | null => {
  if (!Types.ObjectId.isValid(value)) {
    return null;
  }
  return new Types.ObjectId(value);
};

const writeAudit = async (input: {
  actorId?: string | null;
  action: string;
  resource: string;
  resourceId?: string | null;
  before?: unknown;
  after?: unknown;
  meta?: unknown;
}) => {
  try {
    await Audit.create({
      actorId: input.actorId && Types.ObjectId.isValid(input.actorId) ? new Types.ObjectId(input.actorId) : null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId || null,
      before: input.before,
      after: input.after,
      meta: input.meta,
    });
  } catch {
  }
};

const riderProfileFields = [
  'fullName',
  'dateOfBirth',
  'phoneNumber',
  'otpCode',
  'aadhaarNumber',
  'aadhaarFrontImage',
  'aadhaarBackImage',
  'liveSelfieImage',
  'dlNumber',
  'dlExpiryDate',
  'dlFrontImage',
  'vehicleNumber',
  'vehicleType',
  'rcFrontImage',
  'insuranceImage',
] as const;

type RiderProfileField = (typeof riderProfileFields)[number];

type RiderProfilePayload = Record<RiderProfileField, string>;

const sanitizeText = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const isValidHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const formatDdMmYyyy = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
};

const parseDdMmYyyy = (value: string): Date | null => {
  const trimmed = value.trim();
  const ddMmYyyyMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  const yyyyMmDdMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!ddMmYyyyMatch && !yyyyMmDdMatch) {
    return null;
  }

  const day = Number(ddMmYyyyMatch ? ddMmYyyyMatch[1] : yyyyMmDdMatch?.[3]);
  const month = Number(ddMmYyyyMatch ? ddMmYyyyMatch[2] : yyyyMmDdMatch?.[2]);
  const year = Number(ddMmYyyyMatch ? ddMmYyyyMatch[3] : yyyyMmDdMatch?.[1]);
  const parsed = new Date(year, month - 1, day);

  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return null;
  }

  return parsed;
};

const toProfilePayload = (input: unknown): RiderProfilePayload => {
  const raw = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};
  const normalizedDob = parseDdMmYyyy(sanitizeText(raw.dateOfBirth));
  const normalizedDlExpiry = parseDdMmYyyy(sanitizeText(raw.dlExpiryDate));

  return {
    fullName: sanitizeText(raw.fullName)
      .replace(/[^a-zA-Z\s]/g, '')
      .replace(/\s{2,}/g, ' ')
      .slice(0, 60),
    dateOfBirth: normalizedDob ? formatDdMmYyyy(normalizedDob) : sanitizeText(raw.dateOfBirth),
    phoneNumber: sanitizeText(raw.phoneNumber).replace(/\D/g, '').slice(0, 10),
    otpCode: sanitizeText(raw.otpCode),
    aadhaarNumber: sanitizeText(raw.aadhaarNumber).replace(/\D/g, '').slice(0, 12),
    aadhaarFrontImage: sanitizeText(raw.aadhaarFrontImage),
    aadhaarBackImage: sanitizeText(raw.aadhaarBackImage),
    liveSelfieImage: sanitizeText(raw.liveSelfieImage),
    dlNumber: sanitizeText(raw.dlNumber).replace(/[^a-zA-Z0-9/-]/g, '').toUpperCase().slice(0, 20),
    dlExpiryDate: normalizedDlExpiry ? formatDdMmYyyy(normalizedDlExpiry) : sanitizeText(raw.dlExpiryDate),
    dlFrontImage: sanitizeText(raw.dlFrontImage),
    vehicleNumber: sanitizeText(raw.vehicleNumber).replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 12),
    vehicleType: sanitizeText(raw.vehicleType)
      .replace(/[^a-zA-Z\s-]/g, '')
      .replace(/\s{2,}/g, ' ')
      .slice(0, 25),
    rcFrontImage: sanitizeText(raw.rcFrontImage),
    insuranceImage: sanitizeText(raw.insuranceImage),
  };
};

const validateProfilePayload = (payload: RiderProfilePayload): string | null => {
  if (!/^[a-zA-Z\s]{3,60}$/.test(payload.fullName)) {
    return 'Full Name must be 3-60 letters.';
  }

  const dob = parseDdMmYyyy(payload.dateOfBirth);
  if (!dob) {
    return 'Date of Birth must be in valid DD-MM-YYYY format.';
  }

  const today = new Date();
  const minAdultDate = new Date();
  minAdultDate.setFullYear(today.getFullYear() - 18);
  if (dob.getTime() > minAdultDate.getTime()) {
    return 'Rider age must be at least 18 years.';
  }

  if (!/^\d{10}$/.test(payload.phoneNumber)) {
    return 'Phone Number must be exactly 10 digits.';
  }

  if (!/^\d{12}$/.test(payload.aadhaarNumber)) {
    return 'Aadhaar Number must be exactly 12 digits.';
  }

  if (!/^[A-Z0-9/-]{6,20}$/.test(payload.dlNumber)) {
    return 'Driving License Number must be 6-20 characters.';
  }

  const dlExpiry = parseDdMmYyyy(payload.dlExpiryDate);
  if (!dlExpiry) {
    return 'DL Expiry Date must be in valid DD-MM-YYYY format.';
  }

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  if (dlExpiry.getTime() < startOfToday.getTime()) {
    return 'DL Expiry Date must be today or future date.';
  }

  if (!/^[A-Z]{2}\d{1,2}[A-Z]{1,3}\d{4}$/.test(payload.vehicleNumber)) {
    return 'Vehicle Number format invalid. Example: HR12AB1234';
  }

  if (!/^[a-zA-Z\s-]{2,25}$/.test(payload.vehicleType)) {
    return 'Vehicle Type must be 2-25 letters.';
  }

  const urlFields: Array<keyof RiderProfilePayload> = [
    'aadhaarFrontImage',
    'aadhaarBackImage',
    'liveSelfieImage',
    'dlFrontImage',
    'rcFrontImage',
    'insuranceImage',
  ];

  for (const field of urlFields) {
    if (!isValidHttpUrl(payload[field])) {
      return `${field} must be a valid http/https URL.`;
    }
  }

  if (!/^\d{6}$/.test(payload.otpCode)) {
    return 'OTP must be 6 digits.';
  }

  return null;
};

const findDuplicateKycSignals = async (riderId: string, payload: RiderProfilePayload): Promise<string[]> => {
  const conflicts: string[] = [];
  const riderObjectId = toObjectIdOrNull(riderId);

  if (!riderObjectId) {
    return conflicts;
  }

  const riderRole = await Role.findOne({name: 'rider'}).select('_id').lean();
  if (!riderRole?._id) {
    return conflicts;
  }

  const existingPhone = await User.findOne({
    _id: {$ne: riderObjectId},
    roleId: riderRole._id,
    phone: payload.phoneNumber,
  })
    .select('_id name phone')
    .lean();

  if (existingPhone) {
    conflicts.push(`Phone already used by another rider (${String((existingPhone as any).name || 'Unknown')})`);
  }

  const existingAadhaar = await User.findOne({
    _id: {$ne: riderObjectId},
    roleId: riderRole._id,
    'riderProfile.aadhaarNumber': payload.aadhaarNumber,
  })
    .select('_id name riderProfile.aadhaarNumber')
    .lean();

  if (existingAadhaar) {
    conflicts.push(`Aadhaar already used by another rider (${String((existingAadhaar as any).name || 'Unknown')})`);
  }

  const existingDl = await User.findOne({
    _id: {$ne: riderObjectId},
    roleId: riderRole._id,
    'riderProfile.dlNumber': payload.dlNumber,
  })
    .select('_id name riderProfile.dlNumber')
    .lean();

  if (existingDl) {
    conflicts.push(`DL number already used by another rider (${String((existingDl as any).name || 'Unknown')})`);
  }

  const imageFields: Array<keyof RiderProfilePayload> = [
    'aadhaarFrontImage',
    'aadhaarBackImage',
    'liveSelfieImage',
    'dlFrontImage',
    'rcFrontImage',
    'insuranceImage',
  ];

  for (const field of imageFields) {
    const value = payload[field];
    if (!value) continue;

    const docReuse = await User.findOne({
      _id: {$ne: riderObjectId},
      roleId: riderRole._id,
      [`riderProfile.${field}`]: value,
    })
      .select('_id name')
      .lean();

    if (docReuse) {
      conflicts.push(`${field} appears reused from another rider (${String((docReuse as any).name || 'Unknown')})`);
    }
  }

  return conflicts;
};

const runOcrForImageUrl = async (imageUrl: string): Promise<string> => {
  const worker = await createWorker('eng');
  try {
    const result = await worker.recognize(imageUrl);
    return String(result.data.text || '');
  } finally {
    await worker.terminate();
  }
};

const getMissingFields = (payload: RiderProfilePayload): RiderProfileField[] =>
  riderProfileFields.filter((field) => !payload[field]);

const getProfileCompletion = (payload: RiderProfilePayload): number => {
  const completed = riderProfileFields.filter((field) => Boolean(payload[field])).length;
  return Math.round((completed / riderProfileFields.length) * 100);
};

const isKycComplete = (profile: unknown): boolean => {
  const payload = toProfilePayload(profile);
  return getProfileCompletion(payload) === 100;
};

const toProfileResponse = (profile: unknown) => {
  const payload = toProfilePayload(profile);
  return {
    ...payload,
    completion: getProfileCompletion(payload),
  };
};

const riderToBackendStatus = (status: RiderFlowStatus): 'processing' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled' => {
  if (status === 'Accepted') return 'confirmed';
  if (status === 'Picked' || status === 'OutForDelivery') return 'shipped';
  if (status === 'Delivered') return 'delivered';
  if (status === 'Rejected') return 'cancelled';
  return 'processing';
};

export const riderLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const {email, password} = req.body as {email?: string; password?: string};

    if (!email || !password) {
      res.status(400).json({message: 'Email and password are required'});
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      res.status(400).json({message: 'Valid email is required'});
      return;
    }

    const rider = await User.findOne({email: normalizedEmail}).populate('roleId');

    if (!rider || !rider.isActive) {
      res.status(401).json({message: 'Invalid rider credentials'});
      return;
    }

    const roleName = getRoleName(rider);
    if (roleName !== 'rider') {
      res.status(403).json({message: 'Access denied: rider role required'});
      return;
    }

    const passwordMatch = await bcrypt.compare(password, rider.password);
    if (!passwordMatch) {
      res.status(401).json({message: 'Invalid rider credentials'});
      return;
    }

    const token = jwt.sign(
      {
        id: String(rider._id),
        riderId: String(rider._id),
        role: 'rider',
        roleName: 'rider',
      },
      JWT_SECRET,
      {expiresIn: '7d'}
    );

    res.status(200).json({
      token,
      rider: {
        id: String(rider._id),
        name: rider.name,
        phone: rider.phone,
        role: 'rider',
        online: Boolean((rider as any).isOnline),
      },
    });
  } catch (error) {
    res.status(500).json({message: 'Rider login failed'});
  }
};

export const getRiderMe = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = req.user;

    if (!user) {
      res.status(401).json({message: 'Unauthorized'});
      return;
    }

    const roleName = getRoleName(user);
    if (roleName !== 'rider') {
      res.status(403).json({message: 'Access denied: rider role required'});
      return;
    }

    res.status(200).json({
      rider: {
        id: String((user as any)._id || (user as any).id),
        name: (user as any).name,
        phone: (user as any).phone,
        role: 'rider',
        online: Boolean((user as any).isOnline),
        profile: toProfileResponse((user as any).riderProfile),
      },
    });
  } catch (error) {
    res.status(500).json({message: 'Unable to validate rider token'});
  }
};

export const getRiderProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = String(req.user?._id || req.user?.id || '');
    if (!riderId) {
      res.status(401).json({message: 'Unauthorized'});
      return;
    }

    const rider = await User.findById(riderId).select('_id name phone riderProfile roleId');

    if (!rider) {
      res.status(404).json({message: 'Rider not found'});
      return;
    }

    res.status(200).json({
      profile: toProfileResponse((rider as any).riderProfile),
      rider: {
        id: String(rider._id),
        name: rider.name,
        phone: rider.phone,
      },
    });
  } catch (error) {
    res.status(500).json({message: 'Unable to fetch rider profile'});
  }
};

export const updateRiderProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = String(req.user?._id || req.user?.id || '');
    if (!riderId) {
      res.status(401).json({message: 'Unauthorized'});
      return;
    }

    const payload = toProfilePayload(req.body);
    const missing = getMissingFields(payload);

    if (missing.length > 0) {
      res.status(400).json({
        message: 'All rider profile fields are required for production onboarding',
        missingFields: missing,
      });
      return;
    }

    const validationError = validateProfilePayload(payload);
    if (validationError) {
      res.status(400).json({message: validationError});
      return;
    }

    const fraudConflicts = await findDuplicateKycSignals(riderId, payload);
    if (fraudConflicts.length > 0) {
      await writeAudit({
        actorId: riderId,
        action: 'kyc_profile_rejected_duplicate',
        resource: 'rider_kyc',
        resourceId: riderId,
        meta: {fraudConflicts},
      });

      res.status(409).json({
        message: 'Duplicate or suspicious KYC data detected',
        conflicts: fraudConflicts,
      });
      return;
    }

    const otpRecord = riderProfileOtpStore.get(riderId);
    if (!otpRecord) {
      res.status(400).json({message: 'Request verification OTP first'});
      return;
    }

    if (Date.now() > otpRecord.expiresAt) {
      riderProfileOtpStore.delete(riderId);
      res.status(400).json({message: 'Verification OTP expired. Please request a new OTP'});
      return;
    }

    if (payload.otpCode !== otpRecord.otp) {
      res.status(400).json({message: 'Invalid verification OTP'});
      return;
    }

    const updated = await User.findByIdAndUpdate(
      riderId,
      {
        riderProfile: {
          ...payload,
          updatedAt: new Date(),
        },
        name: payload.fullName,
        phone: payload.phoneNumber,
        kycStatus: 'pending',
        kycRejectReason: '',
        kycReviewedAt: null,
        kycReviewedBy: null,
      },
      {new: true}
    ).select('_id name phone riderProfile');

    if (!updated) {
      res.status(404).json({message: 'Rider not found'});
      return;
    }

    riderProfileOtpStore.delete(riderId);

    await writeAudit({
      actorId: riderId,
      action: 'kyc_profile_submitted',
      resource: 'rider_kyc',
      resourceId: riderId,
      after: payload,
      meta: {kycStatus: 'pending'},
    });

    res.status(200).json({
      message: 'Rider profile submitted successfully',
      profile: toProfileResponse((updated as any).riderProfile),
      rider: {
        id: String(updated._id),
        name: updated.name,
        phone: updated.phone,
      },
    });
  } catch (error) {
    res.status(500).json({message: 'Unable to update rider profile'});
  }
};

export const requestRiderProfileOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = String(req.user?._id || req.user?.id || '');
    if (!riderId) {
      res.status(401).json({message: 'Unauthorized'});
      return;
    }

    const rider = await User.findById(riderId).select('_id name phone');
    if (!rider) {
      res.status(404).json({message: 'Rider not found'});
      return;
    }

    const otp = createProfileOtp();
    const expiresAt = Date.now() + PROFILE_OTP_TTL_MS;
    riderProfileOtpStore.set(riderId, {otp, expiresAt});

    const phone = String((rider as any).phone || 'unknown');
    const maskedPhone = phone.length >= 4 ? `${phone.slice(0, -4)}****` : phone;
    const expiresInMinutes = Math.max(1, Math.floor(PROFILE_OTP_TTL_MS / 60000));

    console.log(`\n🔐 Your verification OTP for ${maskedPhone}: ${otp}`);
    console.log(`⏰ Expires in ${expiresInMinutes} minute(s)\n`);

    await writeAudit({
      actorId: riderId,
      action: 'kyc_otp_requested',
      resource: 'rider_kyc',
      resourceId: riderId,
      meta: {maskedPhone, expiresInMinutes},
    });

    res.status(200).json({
      message: `Your verification OTP is ${otp}`,
      otp,
      expiresInSeconds: Math.floor(PROFILE_OTP_TTL_MS / 1000),
    });
  } catch (error) {
    res.status(500).json({message: 'Unable to generate verification OTP'});
  }
};

export const ocrRiderDocumentPrefill = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = String(req.user?._id || req.user?.id || '');
    if (!riderId) {
      res.status(401).json({message: 'Unauthorized'});
      return;
    }

    const {field, imageUrl} = req.body as {field?: 'aadhaarNumber' | 'dlNumber'; imageUrl?: string};

    if (!field || !['aadhaarNumber', 'dlNumber'].includes(field)) {
      res.status(400).json({message: 'field must be aadhaarNumber or dlNumber'});
      return;
    }

    if (!imageUrl || !isValidHttpUrl(String(imageUrl))) {
      res.status(400).json({message: 'Valid imageUrl is required'});
      return;
    }

    const extractedText = await runOcrForImageUrl(String(imageUrl));

    let detectedValue = '';
    if (field === 'aadhaarNumber') {
      const aadhaarMatch = extractedText.replace(/\s+/g, ' ').match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
      detectedValue = aadhaarMatch ? aadhaarMatch[0].replace(/\D/g, '').slice(0, 12) : '';
    } else {
      const normalized = extractedText.toUpperCase().replace(/\s+/g, '');
      const dlMatch = normalized.match(/[A-Z]{2}\d{2}\d{4}\d{7}/) || normalized.match(/[A-Z0-9/-]{8,20}/);
      detectedValue = dlMatch ? dlMatch[0].replace(/[^A-Z0-9/-]/g, '').slice(0, 20) : '';
    }

    await writeAudit({
      actorId: riderId,
      action: 'kyc_ocr_prefill_attempt',
      resource: 'rider_kyc',
      resourceId: riderId,
      meta: {field, detected: Boolean(detectedValue)},
    });

    res.status(200).json({
      field,
      detectedValue,
      extractedText: extractedText.slice(0, 2000),
      message: detectedValue ? 'OCR value detected' : 'No confident value detected',
    });
  } catch (error) {
    res.status(500).json({message: 'Unable to process OCR prefill'});
  }
};

const riderDocumentFields = new Set<RiderProfileField>([
  'aadhaarFrontImage',
  'aadhaarBackImage',
  'liveSelfieImage',
  'dlFrontImage',
  'rcFrontImage',
  'insuranceImage',
]);

export const uploadRiderDocument = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = String(req.user?._id || req.user?.id || '');
    if (!riderId) {
      res.status(401).json({message: 'Unauthorized'});
      return;
    }

    const field = String(req.query.field || '').trim() as RiderProfileField;
    if (!field || !riderDocumentFields.has(field)) {
      res.status(400).json({
        message: 'Invalid field. Provide a valid rider document field.',
      });
      return;
    }

    const file = req.file as Express.Multer.File | undefined;
    if (!file) {
      res.status(400).json({message: 'file is required'});
      return;
    }

    const uploadedUrl = await uploadToMinio(
      file.buffer,
      file.originalname,
      file.mimetype,
      `rider-documents/${riderId}`
    );

    const updatePath = `riderProfile.${field}`;
    const updated = await User.findByIdAndUpdate(
      riderId,
      {
        $set: {
          [updatePath]: uploadedUrl,
          'riderProfile.updatedAt': new Date(),
        },
      },
      {new: true}
    ).select('riderProfile');

    if (!updated) {
      res.status(404).json({message: 'Rider not found'});
      return;
    }

    res.status(200).json({
      message: 'Document uploaded successfully',
      field,
      url: uploadedUrl,
      profile: toProfileResponse((updated as any).riderProfile),
    });
  } catch (error) {
    res.status(500).json({message: 'Unable to upload rider document'});
  }
};

export const getRiderOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = String(req.user?._id || req.user?.id || '');

    if (!riderId) {
      res.status(401).json({message: 'Unauthorized'});
      return;
    }

    const orders = await Order.find({
      $or: [
        {assignedRiderId: riderId},
        {
          assignedRiderId: null,
          $or: [
            {riderStatus: 'Assigned'},
            {riderStatus: null, status: {$in: ['pending', 'processing', 'confirmed']}},
          ],
          rejectedByRiderIds: {$ne: new Types.ObjectId(riderId)},
        },
      ],
    })
      .populate('userId', 'name phone')
      .populate('items.productId', 'name images')
      .sort({createdAt: -1})
      .lean();

    res.status(200).json({orders: orders.map(normalizeRiderOrder)});
  } catch (error) {
    res.status(500).json({message: 'Unable to fetch rider orders'});
  }
};

export const getRiderOrderById = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = String(req.user?._id || req.user?.id || '');
    if (!riderId) {
      res.status(401).json({message: 'Unauthorized'});
      return;
    }

    const {orderId} = req.params;
    const order = await Order.findOne({
      _id: orderId,
      $or: [
        {assignedRiderId: riderId},
        {
          assignedRiderId: null,
          $or: [
            {riderStatus: 'Assigned'},
            {riderStatus: null, status: {$in: ['pending', 'processing', 'confirmed']}},
          ],
          rejectedByRiderIds: {$ne: new Types.ObjectId(riderId)},
        },
      ],
    })
      .populate('userId', 'name phone')
      .populate('items.productId', 'name images')
      .lean();

    if (!order) {
      res.status(404).json({message: 'Order not found'});
      return;
    }

    res.status(200).json({order: normalizeRiderOrder(order)});
  } catch (error) {
    res.status(500).json({message: 'Unable to fetch rider order'});
  }
};

export const updateRiderOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = String(req.user?._id || req.user?.id || '');
    if (!riderId) {
      res.status(401).json({message: 'Unauthorized'});
      return;
    }

    const isOnline = Boolean((req.user as any)?.isOnline);
    if (!isOnline) {
      res.status(403).json({message: 'Go online to accept or update order status'});
      return;
    }

    const {orderId} = req.params;
    const {status} = req.body as {status?: RiderFlowStatus};

    if (!status) {
      res.status(400).json({message: 'status is required'});
      return;
    }

    if (status === 'Accepted') {
      const rider = await User.findById(riderId).select('riderProfile');
      if (!rider) {
        res.status(404).json({message: 'Rider not found'});
        return;
      }

      if (!isKycComplete((rider as any).riderProfile)) {
        res.status(403).json({
          message: 'Complete KYC profile before accepting orders',
          code: 'KYC_INCOMPLETE',
        });
        return;
      }
    }

    const order = await Order.findOne({
      _id: orderId,
      $or: [
        {assignedRiderId: riderId},
        {
          assignedRiderId: null,
          $or: [
            {riderStatus: 'Assigned'},
            {riderStatus: null, status: {$in: ['pending', 'processing', 'confirmed']}},
          ],
          rejectedByRiderIds: {$ne: new Types.ObjectId(riderId)},
        },
      ],
    })
      .populate('userId', 'name phone')
      .populate('items.productId', 'name images');
    if (!order) {
      res.status(404).json({message: 'Order not found'});
      return;
    }

    const current = currentRiderStatus(order);
    if (!allowedTransitions[current].includes(status)) {
      res.status(400).json({message: `Invalid rider status transition from ${current} to ${status}`});
      return;
    }

    let updated: any = null;

    if (status === 'Accepted') {
      updated = await Order.findOneAndUpdate(
        {
          _id: orderId,
          assignedRiderId: null,
          $or: [
            {riderStatus: 'Assigned'},
            {riderStatus: null, status: {$in: ['pending', 'processing', 'confirmed']}},
          ],
        },
        {
          assignedRiderId: riderId,
          riderStatus: 'Accepted',
          status: riderToBackendStatus('Accepted'),
          $set: {rejectedByRiderIds: []},
        },
        {new: true}
      )
        .populate('userId', 'name phone')
        .populate('items.productId', 'name images');

      if (!updated) {
        res.status(409).json({message: 'Order already accepted by another rider'});
        return;
      }
    } else if (status === 'Rejected') {
      if (String((order as any).assignedRiderId || '') === riderId) {
        updated = await Order.findByIdAndUpdate(
          orderId,
          {
            assignedRiderId: null,
            riderStatus: 'Assigned',
            status: 'processing',
            $addToSet: {rejectedByRiderIds: new Types.ObjectId(riderId)},
          },
          {new: true}
        )
          .populate('userId', 'name phone')
          .populate('items.productId', 'name images');
      } else {
        updated = await Order.findByIdAndUpdate(
          orderId,
          {
            $addToSet: {rejectedByRiderIds: new Types.ObjectId(riderId)},
          },
          {new: true}
        )
          .populate('userId', 'name phone')
          .populate('items.productId', 'name images');
      }
    } else {
      if (String((order as any).assignedRiderId || '') !== riderId) {
        res.status(409).json({message: 'Order is not assigned to this rider'});
        return;
      }

      updated = await Order.findByIdAndUpdate(
        orderId,
        {
          riderStatus: status,
          status: riderToBackendStatus(status),
        },
        {new: true}
      )
        .populate('userId', 'name phone')
        .populate('items.productId', 'name images');
    }

    if (!updated) {
      res.status(404).json({message: 'Order not found'});
      return;
    }

    res.status(200).json({order: normalizeRiderOrder(updated)});
    void emitOrderRealtime(String(updated._id), { event: 'status' });
  } catch (error) {
    res.status(500).json({message: 'Unable to update rider order status'});
  }
};

export const updateRiderOnlineStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = String(req.user?._id || req.user?.id || '');
    if (!riderId) {
      res.status(401).json({message: 'Unauthorized'});
      return;
    }

    const {online} = req.body as {online?: boolean};
    if (typeof online !== 'boolean') {
      res.status(400).json({message: 'online must be a boolean'});
      return;
    }

    const updated = await User.findByIdAndUpdate(
      riderId,
      {isOnline: online},
      {new: true}
    ).select('_id name phone isOnline roleId');

    if (!updated) {
      res.status(404).json({message: 'Rider not found'});
      return;
    }

    res.status(200).json({
      message: 'Rider status updated',
      rider: {
        id: String(updated._id),
        name: updated.name,
        phone: updated.phone,
        role: 'rider',
        online: Boolean((updated as any).isOnline),
      },
    });
  } catch (error) {
    res.status(500).json({message: 'Unable to update rider online status'});
  }
};

export const updateRiderLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = String(req.user?._id || req.user?.id || '');
    if (!riderId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { latitude, longitude, accuracy, timestamp } = req.body as {
      latitude?: number;
      longitude?: number;
      accuracy?: number;
      timestamp?: string;
    };

    const lat = Number(latitude);
    const lng = Number(longitude);
    const acc = Number(accuracy ?? 0);
    const ts = timestamp ? new Date(timestamp) : new Date();

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      res.status(400).json({ message: 'Valid latitude and longitude are required' });
      return;
    }

    await User.findByIdAndUpdate(riderId, {
      latitude: lat,
      longitude: lng,
      isOnline: true,
    });

    const activeOrders = await Order.find({
      assignedRiderId: riderId,
      status: { $in: ['processing', 'confirmed', 'shipped'] },
    }).select('_id');

    if (activeOrders.length > 0) {
      await Order.updateMany(
        {
          _id: { $in: activeOrders.map((order) => order._id) },
        },
        {
          $set: {
            riderLocation: {
              latitude: lat,
              longitude: lng,
              accuracy: Number.isFinite(acc) ? acc : 0,
              timestamp: Number.isNaN(ts.getTime()) ? new Date() : ts,
            },
          },
        }
      );

      const now = Date.now();
      const lastEmitAt = riderLocationEmitCache.get(riderId) || 0;
      const shouldEmit = now - lastEmitAt >= LOCATION_REALTIME_EMIT_MIN_INTERVAL_MS;

      if (shouldEmit) {
        riderLocationEmitCache.set(riderId, now);
        for (const order of activeOrders) {
          void emitOrderRealtime(String(order._id), { event: 'updated' });
        }
      }
    }

    res.status(200).json({
      message: 'Location updated',
      updatedOrders: activeOrders.length,
    });
  } catch (error) {
    res.status(500).json({ message: 'Unable to update rider location' });
  }
};