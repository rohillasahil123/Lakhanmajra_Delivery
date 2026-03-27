import { Response } from 'express';
import mongoose, { Types } from 'mongoose';
import Order from '../models/order.model';
import Cart from '../models/Cart.model';
import { Product } from '../models/product.model';
import { getChannel } from '../config/rabbitmq';
import { OrderQueueMessage } from '../types';
import User from '../models/user.model';
import { recordAudit } from './audit.service';
import { emitOrderRealtime } from './realtime.service';
import { AuthRequest } from '../middlewares/auth.middleware';
import { findMatchingZoneForAddress } from './deliveryZone.service';

const COD_DELIVERY_FEE = 10;
const ONLINE_DELIVERY_FEE = 8;
const ADDON_WINDOW_MS = 60 * 1000;

const getOrderItemProductId = (item: any): string => {
  const raw = item?.productId ?? item?.product;
  if (!raw) return '';
  if (typeof raw === 'string') return raw;
  if (raw && typeof raw === 'object' && raw._id) return String(raw._id);
  return String(raw);
};

const restoreStockForOrder = async (order: any): Promise<void> => {
  const items = Array.isArray(order?.items) ? order.items : [];

  for (const item of items) {
    const productId = getOrderItemProductId(item);
    const variantId = item?.variantId ? String(item.variantId) : '';
    const quantity = Number(item?.quantity || 0);
    if (!productId || quantity <= 0) continue;

    if (variantId) {
      await Product.updateOne(
        { _id: productId, 'variants._id': variantId },
        { $inc: { stock: quantity, 'variants.$.stock': quantity } }
      );
      continue;
    }

    await Product.updateOne({ _id: productId }, { $inc: { stock: quantity } });
  }
};

const getCancellationPolicy = async (userId: string) => {
  const cancelledOrdersCount = await Order.countDocuments({ userId, status: 'cancelled' });
  const latestCancelledOrder = await Order.findOne({ userId, status: 'cancelled' })
    .select('createdAt')
    .sort({ createdAt: -1 })
    .lean<{ createdAt?: Date }>();

  let codAllowed = true;
  if (latestCancelledOrder?.createdAt) {
    const onlineOrderAfterCancel = await Order.findOne({
      userId,
      paymentMethod: 'online',
      status: { $ne: 'cancelled' },
      createdAt: { $gt: new Date(latestCancelledOrder.createdAt) },
    })
      .select('_id')
      .lean<{ _id: Types.ObjectId } | null>();

    codAllowed = !!onlineOrderAfterCancel;
  }

  return {
    cancelledOrdersCount,
    requiresAdvancePayment: false,
    codAllowed,
    advanceAmount: 0,
  };
};

export const getOrderEligibility = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const userId = String(req.user?.id || req.user?._id || '');
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const policy = await getCancellationPolicy(userId);
    res.status(200).json({ success: true, data: policy });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  let session: mongoose.ClientSession | null = null;
  try {
    const userId = String(req.user?.id || req.user?._id || '');
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const { shippingAddress, paymentMethod = 'cod', advancePaid = false, addonSourceOrderId } = req.body;
    const normalizedPaymentMethod = paymentMethod === 'online' ? 'online' : 'cod';
    const normalizedAddonSourceOrderId =
      typeof addonSourceOrderId === 'string' ? addonSourceOrderId.trim() : '';

    const policy = await getCancellationPolicy(userId);

    if (!policy.codAllowed && normalizedPaymentMethod === 'cod') {
      res.status(400).json({
        message: 'COD is disabled until you complete one online order after your latest cancellation.',
        data: policy,
      });
      return;
    }

    if (policy.requiresAdvancePayment && policy.advanceAmount > 0 && !advancePaid) {
      res.status(400).json({
        message: `Advance payment of ₹${policy.advanceAmount} is required before placing your next order.`,
        data: policy,
      });
      return;
    }

    // Validation
    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.pincode) {
      res.status(400).json({ message: 'Complete shipping address is required' });
      return;
    }

    const latitude = Number(shippingAddress.latitude);
    const longitude = Number(shippingAddress.longitude);

    const normalizedShippingAddress = {
      street: String(shippingAddress.street),
      city: String(shippingAddress.city),
      state: String(shippingAddress.state),
      pincode: String(shippingAddress.pincode),
      ...(Number.isFinite(latitude) ? { latitude } : {}),
      ...(Number.isFinite(longitude) ? { longitude } : {}),
    };

    const zone = await findMatchingZoneForAddress(normalizedShippingAddress);
    if (!zone) {
      res.status(400).json({
        message: 'We currently deliver only in Lakhan Majra. Please select a delivery location within our service area.',
      });
      return;
    }

    session = await mongoose.startSession();
    session.startTransaction();

    // Cart se items fetch karo (only active cart)
    const cart = await Cart.findOne({ user: userId, status: 'active' }).session(session);
    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      session.endSession();
      session = null;
      res.status(400).json({ message: 'Cart is empty' });
      return;
    }

    const stockIssues: string[] = [];

    const getCartItemProductId = (item: any): string => getOrderItemProductId(item);

    for (const item of cart.items) {
      const productId = getCartItemProductId(item);
      if (!productId) {
        stockIssues.push(`${item.name || 'Product'} is invalid in cart`);
        continue;
      }

      const product = await Product.findById(productId).session(session);

      if (!product || !product.isActive) {
        stockIssues.push(`${item.name || 'Product'} is not available`);
        continue;
      }

      const variantId = item?.variantId ? String(item.variantId) : '';
      const selectedVariant = variantId
        ? (Array.isArray((product as any).variants)
            ? (product as any).variants.find((entry: any) => String(entry?._id) === variantId)
            : null)
        : null;

      if (variantId && !selectedVariant) {
        stockIssues.push(`Variant not found for ${product.name}`);
        continue;
      }

      const availableStock = selectedVariant ? Number(selectedVariant.stock || 0) : Number(product.stock || 0);

      if (availableStock <= 0) {
        stockIssues.push(`${product.name} is out of stock`);
        continue;
      }

      if (availableStock < item.quantity) {
        stockIssues.push(`Only ${availableStock} qty available for ${product.name}`);
      }
    }

    if (stockIssues.length > 0) {
      await session.abortTransaction();
      session.endSession();
      session = null;
      res.status(400).json({
        message: 'Some cart items are out of stock',
        errors: stockIssues,
      });
      return;
    }

    let addonSourceOrder:
      | {
          _id: Types.ObjectId;
          createdAt: Date;
          paymentMethod: 'online' | 'cod';
          status: string;
        }
      | null = null;

    if (normalizedAddonSourceOrderId && Types.ObjectId.isValid(normalizedAddonSourceOrderId)) {
      const candidate = await Order.findOne({
        _id: new Types.ObjectId(normalizedAddonSourceOrderId),
        userId: new Types.ObjectId(userId),
        deliveryFee: { $gt: 0 },
        status: { $ne: 'cancelled' },
      })
        .select('_id createdAt paymentMethod status')
        .lean<{
          _id: Types.ObjectId;
          createdAt?: Date;
          paymentMethod: 'online' | 'cod';
          status: string;
        }>();

      if (candidate?.createdAt) {
        const elapsedMs = Date.now() - new Date(candidate.createdAt).getTime();
        if (elapsedMs >= 0 && elapsedMs <= ADDON_WINDOW_MS) {
          addonSourceOrder = {
            _id: candidate._id,
            createdAt: new Date(candidate.createdAt),
            paymentMethod: candidate.paymentMethod,
            status: candidate.status,
          };
        }
      }
    }

    // Calculate total
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    let deliveryFee = COD_DELIVERY_FEE;
    if (normalizedPaymentMethod === 'online') {
      deliveryFee = ONLINE_DELIVERY_FEE;
    }
    if (addonSourceOrder) {
      deliveryFee = 0;
    }
    const totalAmount = subtotal + deliveryFee;

    // Order create karo
    const orderPayload = {
      userId: new Types.ObjectId(userId),
      items: cart.items.map(item => ({
        productId: new Types.ObjectId(getCartItemProductId(item)),
        variantId: item.variantId ? new Types.ObjectId(String(item.variantId)) : undefined,
        variantLabel: item.variantLabel || item.variant?.label || item.variant?.size || '',
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount,
      deliveryFee,
      paymentMethod: normalizedPaymentMethod as 'cod' | 'online',
      shippingAddress: normalizedShippingAddress,
      paymentStatus: (advancePaid ? 'paid' : 'pending') as 'paid' | 'pending',
      riderStatus: 'Assigned' as 'Assigned',
      rejectedByRiderIds: [],
    };

    const [order] = (await Order.create([orderPayload], { session })) as any[];

    const quantityByProduct = new Map<string, number>();
    const quantityByProductVariant = new Map<string, number>();
    for (const item of cart.items) {
      const productId = getCartItemProductId(item);
      const variantId = item?.variantId ? String(item.variantId) : '';
      const quantityToReduce = Number(item.quantity || 0);
      if (!productId || quantityToReduce <= 0) continue;
      quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + quantityToReduce);
      if (variantId) {
        const key = `${productId}:${variantId}`;
        quantityByProductVariant.set(key, (quantityByProductVariant.get(key) || 0) + quantityToReduce);
      }
    }

    const stockOps = Array.from(quantityByProduct.entries()).map(([productId, quantity]) => ({
      updateOne: {
        filter: { _id: productId, isActive: true, isDeleted: false, stock: { $gte: quantity } },
        update: { $inc: { stock: -quantity } },
      },
    }));

    const variantStockOps = Array.from(quantityByProductVariant.entries()).map(([key, quantity]) => {
      const [productId, variantId] = key.split(':');
      return {
        updateOne: {
          filter: {
            _id: productId,
            isActive: true,
            isDeleted: false,
            stock: { $gte: quantity },
            variants: {
              $elemMatch: {
                _id: new Types.ObjectId(variantId),
                stock: { $gte: quantity },
              },
            },
          },
          update: {
            $inc: {
              stock: -quantity,
              'variants.$.stock': -quantity,
            },
          },
        },
      };
    });

    const allStockOps = [...stockOps, ...variantStockOps];

    if (allStockOps.length > 0) {
      const stockResult = await Product.bulkWrite(allStockOps, { session });
      if (stockResult.modifiedCount !== allStockOps.length) {
        await session.abortTransaction();
        session.endSession();
        session = null;
        res.status(409).json({
          message: 'Stock changed during checkout. Please review cart and place order again.',
        });
        return;
      }
    }

    // Cart clear karo
    cart.items = [];
    await cart.save({ session });

    await session.commitTransaction();
    session.endSession();
    session = null;

    // RabbitMQ me message send karo
    const channel = getChannel();
    const message: OrderQueueMessage = { orderId: order._id.toString() };
    
    channel.sendToQueue('order_queue', 
      Buffer.from(JSON.stringify(message)),
      { persistent: true }
    );

    const sourceCreatedAt = addonSourceOrder?.createdAt
      ? new Date(addonSourceOrder.createdAt)
      : null;
    const orderCreatedAt = order?.createdAt ? new Date(order.createdAt) : new Date();
    let addonWindowExpiresAt: string | null = null;
    if (sourceCreatedAt) {
      addonWindowExpiresAt = new Date(sourceCreatedAt.getTime() + ADDON_WINDOW_MS).toISOString();
    } else {
      addonWindowExpiresAt = new Date(orderCreatedAt.getTime() + ADDON_WINDOW_MS).toISOString();
    }

    res.status(201).json({
      message: 'Order placed successfully',
      order,
      addonWindowExpiresAt,
      addonDeliveryFeeApplied: !!addonSourceOrder,
    });

    void emitOrderRealtime(String(order._id), { event: 'created' });
  } catch (error) {
    if (session) {
      await session.abortTransaction();
      session.endSession();
    }
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getMyOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({ userId: req.user!.id })
      .populate('items.productId')
      .populate('assignedRiderId', 'name phone')
      .sort({ createdAt: -1 });

    const normalizedOrders = orders.map((order) => {
      const plain = order.toObject();
      const rider: any = (plain as any).assignedRiderId;
      return {
        ...plain,
        assignedRiderId:
          rider && typeof rider === 'object'
            ? {
                _id: rider._id,
                name: rider.name || '',
                phone: rider.phone || '',
              }
            : null,
      };
    });

    res.json(normalizedOrders);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findOne({ 
      _id: req.params.id, 
      userId: req.user!.id 
    }).populate('items.productId');
    
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// Admin: get order detail
export const adminGetOrderById = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const order = await Order.findById(id)
      .populate('userId')
      .populate('assignedRiderId')
      .populate('items.productId');
    
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

/* ================= ADMIN / STAFF: list & manage orders ================= */
export const adminListOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', status, paymentMethod, q, from, to, today } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);
    const pipeline: any[] = [];

    // Stage 1: Lookup user data to enable searching by customer name/phone
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'userDetails'
      }
    });

    // Stage 2: Unwind userDetails (convert array to object)
    pipeline.push({ $unwind: { path: '$userDetails', preserveNullAndEmptyArrays: true } });

    // Stage 3: Build match filters
    const matchStage: any = {};

    if (status && status !== 'all') matchStage.status = status;
    if (paymentMethod && paymentMethod !== 'all') matchStage.paymentMethod = paymentMethod;

    if (today === '1' || today === 'true') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      matchStage.createdAt = { $gte: start, $lte: end };
    } else if (from || to) {
      const dateRange: any = {};
      if (from) {
        const start = new Date(String(from));
        start.setHours(0, 0, 0, 0);
        dateRange.$gte = start;
      }
      if (to) {
        const end = new Date(String(to));
        end.setHours(23, 59, 59, 999);
        dateRange.$lte = end;
      }
      if (Object.keys(dateRange).length > 0) matchStage.createdAt = dateRange;
    }

    // Stage 4: Handle search query
    if (q) {
      const queryText = String(q).trim();
      const regex = new RegExp(queryText, 'i');
      const orConditions: any[] = [
        { 'userDetails.name': regex },
        { 'userDetails.phone': regex },
        { 'shippingAddress.street': regex }
      ];

      if (Types.ObjectId.isValid(queryText)) {
        orConditions.push({ _id: new Types.ObjectId(queryText) });
      }

      matchStage.$or = orConditions;
    }

    if (Object.keys(matchStage).length > 0) {
      pipeline.push({ $match: matchStage });
    }

    // Stage 5: Sort by creation date descending
    pipeline.push({ $sort: { createdAt: -1 } });

    // Stage 6: Get total count before pagination
    const countPipeline = [...pipeline, { $count: 'total' }];
    const countResult = await Order.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Stage 7: Add pagination
    pipeline.push({ $skip: skip });
    pipeline.push({ $limit: Number(limit) });

    // Stage 8: Lookup for assigned rider
    pipeline.push({
      $lookup: {
        from: 'users',
        localField: 'assignedRiderId',
        foreignField: '_id',
        as: 'riderDetails'
      }
    });

    pipeline.push({ $unwind: { path: '$riderDetails', preserveNullAndEmptyArrays: true } });

    // Stage 9: Lookup for product details
    pipeline.push({
      $lookup: {
        from: 'products',
        localField: 'items.productId',
        foreignField: '_id',
        as: 'productDetails'
      }
    });

    // Stage 10: Project the result
    pipeline.push({
      $project: {
        _id: 1,
        totalAmount: 1,
        deliveryFee: 1,
        paymentMethod: 1,
        paymentStatus: 1,
        status: 1,
        riderStatus: 1,
        items: 1,
        shippingAddress: 1,
        riderLocation: 1,
        etaMinutes: 1,
        createdAt: 1,
        updatedAt: 1,
        userId: {
          _id: '$userDetails._id',
          name: '$userDetails.name',
          email: '$userDetails.email',
          phone: '$userDetails.phone'
        },
        assignedRiderId: {
          _id: '$riderDetails._id',
          name: '$riderDetails.name',
          email: '$riderDetails.email',
          phone: '$riderDetails.phone'
        },
        productDetails: 1
      }
    });

    const orders = await Order.aggregate(pipeline);

    res.json({ orders, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getOrderStats = async (_req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Get comprehensive stats across all orders
    const statsAgg = await Order.aggregate([
      {
        $facet: {
          total: [{ $count: 'count' }],
          statusCount: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 }
              }
            }
          ],
          paymentMethodCount: [
            {
              $group: {
                _id: '$paymentMethod',
                count: { $sum: 1 }
              }
            }
          ],
          totalRevenue: [
            {
              $group: {
                _id: null,
                revenue: { $sum: '$totalAmount' }
              }
            }
          ]
        }
      }
    ]);

    const result = statsAgg[0];
    const totalCount = result.total[0]?.count || 0;
    
    // Build status counts object
    const statusCounts: any = {
      pending: 0,
      confirmed: 0,
      processing: 0,
      shipped: 0,
      delivered: 0,
      cancelled: 0
    };
    
    result.statusCount.forEach((item: any) => {
      if (statusCounts.hasOwnProperty(item._id)) {
        statusCounts[item._id] = item.count;
      }
    });

    // Build payment method counts
    const paymentCounts: any = {
      cod: 0,
      online: 0
    };
    
    result.paymentMethodCount.forEach((item: any) => {
      if (paymentCounts.hasOwnProperty(item._id)) {
        paymentCounts[item._id] = item.count;
      }
    });

    const revenue = result.totalRevenue[0]?.revenue || 0;

    const stats = {
      total: totalCount,
      pending: statusCounts.pending,
      confirmed: statusCounts.confirmed,
      processing: statusCounts.processing,
      shipped: statusCounts.shipped,
      delivered: statusCounts.delivered,
      cancelled: statusCounts.cancelled,
      cod: paymentCounts.cod,
      online: paymentCounts.online,
      revenue
    };

    res.json({ data: stats });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const assignOrderToRider = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const { riderId } = req.body;
    if (!riderId) {
      res.status(400).json({ message: 'riderId is required' });
      return;
    }

    const rider = await User.findById(riderId).populate('roleId');
    if (!rider) { res.status(404).json({ message: 'Rider not found' }); return; }
    const riderRole = (rider as any).roleId?.name || (rider as any).role || '';
    if (riderRole !== 'rider') { res.status(400).json({ message: 'User is not a rider' }); return; }

    const before = await Order.findById(id);
    const order = await Order.findByIdAndUpdate(
      id,
      { assignedRiderId: riderId, status: 'processing', riderStatus: 'Assigned', rejectedByRiderIds: [] },
      { new: true }
    ).populate('userId').populate('assignedRiderId');

    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }

    recordAudit({
      actorId: (req as any).user?.id,
      action: 'assign',
      resource: 'order',
      resourceId: id,
      meta: { riderId },
      before: before?.toObject(),
      after: order.toObject(),
    }).catch(() => {}); // non‑blocking

    res.json({ message: 'Rider assigned', order });
    void emitOrderRealtime(String(order._id), { event: 'assigned' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const adminUpdateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];
    const { status } = req.body;
    const allowed = ['pending','processing','confirmed','shipped','delivered','cancelled'];
    if (!allowed.includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const before = await Order.findById(id);
    if (!before) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (status === 'cancelled' && before.status !== 'cancelled') {
      await restoreStockForOrder(before);
    }

    const order = await Order.findByIdAndUpdate(id, { status }, { new: true }).populate('userId').populate('assignedRiderId');
    if (!order) { res.status(404).json({ message: 'Order not found' }); return; }

    recordAudit({
      actorId: (req as any).user?.id,
      action: 'status_update',
      resource: 'order',
      resourceId: id,
      meta: { oldStatus: before?.status, newStatus: status },
      before: before?.toObject(),
      after: order.toObject(),
    }).catch(() => {}); // non‑blocking

    res.json({ message: 'Status updated', order });
    void emitOrderRealtime(String(order._id), { event: 'status' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const cancelMyOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let { id } = req.params;
    if (Array.isArray(id)) id = id[0];

    const userId = String(req.user?.id || req.user?._id || '');
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const order = await Order.findOne({ _id: id, userId });
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.status === 'cancelled') {
      res.status(200).json({ message: 'Order already cancelled', order });
      return;
    }

    if (order.status === 'delivered' || order.status === 'shipped') {
      res.status(400).json({ message: 'Delivered or shipped order cannot be cancelled' });
      return;
    }

    await restoreStockForOrder(order);
    order.status = 'cancelled';
    await order.save();

    res.status(200).json({ message: 'Order cancelled and stock restored', order });
    void emitOrderRealtime(String(order._id), { event: 'cancelled' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
