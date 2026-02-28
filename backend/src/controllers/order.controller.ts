import { Response } from 'express';
import { Request } from 'express';
import mongoose, { Types } from 'mongoose';
import Order from '../models/order.model';
import Cart from '../models/Cart.model';
import { Product } from '../models/product.model';
import { getChannel } from '../config/rabbitmq';
import { OrderQueueMessage } from '../types';
import User from '../models/user.model';
import { recordAudit } from '../services/audit.service';
import { emitOrderRealtime } from '../services/realtime.service';

const CANCELLATION_THRESHOLD = 3;
const ADVANCE_CHARGE = 20;
const COD_DELIVERY_FEE = 10;
const ONLINE_DELIVERY_FEE = 8;

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
    const quantity = Number(item?.quantity || 0);
    if (!productId || quantity <= 0) continue;
    await Product.updateOne({ _id: productId }, { $inc: { stock: quantity } });
  }
};

const getCancellationPolicy = async (userId: string) => {
  const cancelledOrdersCount = await Order.countDocuments({ userId, status: 'cancelled' });
  const requiresAdvancePayment = cancelledOrdersCount >= CANCELLATION_THRESHOLD;
  const codAllowed = !requiresAdvancePayment;

  return {
    cancelledOrdersCount,
    requiresAdvancePayment,
    codAllowed,
    advanceAmount: ADVANCE_CHARGE,
  };
};

export const getOrderEligibility = async (req: Request, res: Response): Promise<void> => {
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

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  let session: mongoose.ClientSession | null = null;
  try {
    const userId = String(req.user?.id || req.user?._id || '');
    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }
    const { shippingAddress, paymentMethod = 'cod', advancePaid = false } = req.body;
    const normalizedPaymentMethod = paymentMethod === 'online' ? 'online' : 'cod';

    const policy = await getCancellationPolicy(userId);

    if (!policy.codAllowed && normalizedPaymentMethod === 'cod') {
      res.status(400).json({
        message: `COD is disabled for your next order due to ${policy.cancelledOrdersCount} cancelled orders. Please pay ₹${policy.advanceAmount} advance.`,
        data: policy,
      });
      return;
    }

    if (policy.requiresAdvancePayment && !advancePaid) {
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

      if ((product.stock || 0) <= 0) {
        stockIssues.push(`${product.name} is out of stock`);
        continue;
      }

      if ((product.stock || 0) < item.quantity) {
        stockIssues.push(`Only ${product.stock} qty available for ${product.name}`);
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

    // Calculate total
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);
    const deliveryFee = normalizedPaymentMethod === 'online' ? ONLINE_DELIVERY_FEE : COD_DELIVERY_FEE;
    const totalAmount = subtotal + deliveryFee;

    // Order create karo
    const orderPayload = {
      userId,
      items: cart.items.map(item => ({
        productId: getCartItemProductId(item),
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount,
      deliveryFee,
      paymentMethod: normalizedPaymentMethod,
      shippingAddress: normalizedShippingAddress,
      paymentStatus: advancePaid ? 'paid' : 'pending',
      riderStatus: 'Assigned',
      rejectedByRiderIds: [],
    };

    const [order] = await Order.create([orderPayload], { session });

    const quantityByProduct = new Map<string, number>();
    for (const item of cart.items) {
      const productId = getCartItemProductId(item);
      const quantityToReduce = Number(item.quantity || 0);
      if (!productId || quantityToReduce <= 0) continue;
      quantityByProduct.set(productId, (quantityByProduct.get(productId) || 0) + quantityToReduce);
    }

    const stockOps = Array.from(quantityByProduct.entries()).map(([productId, quantity]) => ({
      updateOne: {
        filter: { _id: productId, isActive: true, isDeleted: false, stock: { $gte: quantity } },
        update: { $inc: { stock: -quantity } },
      },
    }));

    if (stockOps.length > 0) {
      const stockResult = await Product.bulkWrite(stockOps, { session });
      if (stockResult.modifiedCount !== stockOps.length) {
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

    res.status(201).json({ 
      message: 'Order placed successfully', 
      order 
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

export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
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

export const getOrderById = async (req: Request, res: Response): Promise<void> => {
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
export const adminGetOrderById = async (req: Request, res: Response): Promise<void> => {
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
export const adminListOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const { page = '1', limit = '20', status, paymentMethod, q, from, to, today } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);
    const filters: any = {};

    if (status && status !== 'all') filters.status = status;
    if (paymentMethod && paymentMethod !== 'all') filters.paymentMethod = paymentMethod;

    if (today === '1' || today === 'true') {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      filters.createdAt = { $gte: start, $lte: end };
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
      if (Object.keys(dateRange).length > 0) filters.createdAt = dateRange;
    }

    if (q) {
      // allow searching by customer name or order id
      const queryText = String(q).trim();
      const regex = new RegExp(queryText, 'i');
      const or: any[] = [{ 'shippingAddress.street': regex }];

      if (Types.ObjectId.isValid(queryText)) {
        or.push({ _id: queryText });
      }

      filters.$or = or;
    }

    const orders = await Order.find(filters)
      .populate('userId', 'name email phone')
      .populate('assignedRiderId', 'name email phone')
      .populate('items.productId', 'name images price')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Order.countDocuments(filters);

    res.json({ orders, total, page: Number(page), limit: Number(limit) });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const assignOrderToRider = async (req: Request, res: Response): Promise<void> => {
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

export const adminUpdateOrderStatus = async (req: Request, res: Response): Promise<void> => {
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

export const cancelMyOrder = async (req: Request, res: Response): Promise<void> => {
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
