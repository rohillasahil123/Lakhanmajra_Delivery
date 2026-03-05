import {Request, Response} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {Types} from 'mongoose';
import User from '../models/user.model';
import Order from '../models/order.model';
import { emitOrderRealtime } from '../services/realtime.service';
import { uploadToMinio } from '../services/minio.service';

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
const riderLocationEmitCache = new Map<string, number>();

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
  'accountHolderName',
  'bankAccountNumber',
  'ifscCode',
  'cancelledChequeImage',
  'policeVerificationDocument',
  'emergencyContactName',
  'emergencyContactNumber',
] as const;

type RiderProfileField = (typeof riderProfileFields)[number];

type RiderProfilePayload = Record<RiderProfileField, string>;

const sanitizeText = (value: unknown): string => {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
};

const toProfilePayload = (input: unknown): RiderProfilePayload => {
  const raw = input && typeof input === 'object' ? (input as Record<string, unknown>) : {};

  return {
    fullName: sanitizeText(raw.fullName),
    dateOfBirth: sanitizeText(raw.dateOfBirth),
    phoneNumber: sanitizeText(raw.phoneNumber),
    otpCode: sanitizeText(raw.otpCode),
    aadhaarNumber: sanitizeText(raw.aadhaarNumber),
    aadhaarFrontImage: sanitizeText(raw.aadhaarFrontImage),
    aadhaarBackImage: sanitizeText(raw.aadhaarBackImage),
    liveSelfieImage: sanitizeText(raw.liveSelfieImage),
    dlNumber: sanitizeText(raw.dlNumber),
    dlExpiryDate: sanitizeText(raw.dlExpiryDate),
    dlFrontImage: sanitizeText(raw.dlFrontImage),
    vehicleNumber: sanitizeText(raw.vehicleNumber),
    vehicleType: sanitizeText(raw.vehicleType),
    rcFrontImage: sanitizeText(raw.rcFrontImage),
    insuranceImage: sanitizeText(raw.insuranceImage),
    accountHolderName: sanitizeText(raw.accountHolderName),
    bankAccountNumber: sanitizeText(raw.bankAccountNumber),
    ifscCode: sanitizeText(raw.ifscCode).toUpperCase(),
    cancelledChequeImage: sanitizeText(raw.cancelledChequeImage),
    policeVerificationDocument: sanitizeText(raw.policeVerificationDocument),
    emergencyContactName: sanitizeText(raw.emergencyContactName),
    emergencyContactNumber: sanitizeText(raw.emergencyContactNumber),
  };
};

const getMissingFields = (payload: RiderProfilePayload): RiderProfileField[] =>
  riderProfileFields.filter((field) => !payload[field]);

const getProfileCompletion = (payload: RiderProfilePayload): number => {
  const completed = riderProfileFields.filter((field) => Boolean(payload[field])).length;
  return Math.round((completed / riderProfileFields.length) * 100);
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
    const {riderId, password} = req.body as {riderId?: string; password?: string};

    if (!riderId || !password) {
      res.status(400).json({message: 'riderId and password are required'});
      return;
    }

    const normalizedRiderId = riderId.trim();
    const riderQuery: any[] = [{phone: normalizedRiderId}, {email: normalizedRiderId.toLowerCase()}];

    if (Types.ObjectId.isValid(normalizedRiderId)) {
      riderQuery.push({_id: normalizedRiderId});
    }

    const rider = await User.findOne({$or: riderQuery}).populate('roleId');

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

    const updated = await User.findByIdAndUpdate(
      riderId,
      {
        riderProfile: {
          ...payload,
          updatedAt: new Date(),
        },
        name: payload.fullName,
        phone: payload.phoneNumber,
      },
      {new: true}
    ).select('_id name phone riderProfile');

    if (!updated) {
      res.status(404).json({message: 'Rider not found'});
      return;
    }

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

const riderDocumentFields = new Set<RiderProfileField>([
  'aadhaarFrontImage',
  'aadhaarBackImage',
  'liveSelfieImage',
  'dlFrontImage',
  'rcFrontImage',
  'insuranceImage',
  'cancelledChequeImage',
  'policeVerificationDocument',
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

    const {orderId} = req.params;
    const {status} = req.body as {status?: RiderFlowStatus};

    if (!status) {
      res.status(400).json({message: 'status is required'});
      return;
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
    void emitOrderRealtime(String(updated._id), { event: 'updated' });
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