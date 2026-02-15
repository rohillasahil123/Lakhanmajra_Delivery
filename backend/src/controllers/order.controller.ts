import { Response } from 'express';
import { Request } from 'express';
import Order from '../models/order.model';
import Cart from '../models/Cart.model';
import { getChannel } from '../config/rabbitmq';
import { OrderQueueMessage } from '../types';
import User from '../models/user.model';
import { recordAudit } from '../services/audit.service';

export const createOrder = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { shippingAddress } = req.body;

    // Validation
    if (!shippingAddress || !shippingAddress.street || !shippingAddress.city || 
        !shippingAddress.state || !shippingAddress.pincode) {
      res.status(400).json({ message: 'Complete shipping address is required' });
      return;
    }

    // Cart se items fetch karo
    const cart = await Cart.findOne({ user: userId });
    if (!cart || cart.items.length === 0) {
      res.status(400).json({ message: 'Cart is empty' });
      return;
    }

    // Calculate total
    const totalAmount = cart.items.reduce((sum, item) => {
      return sum + (item.price * item.quantity);
    }, 0);

    // Order create karo
    const order = new Order({
      userId,
      items: cart.items.map(item => ({
        productId: item.product,
        quantity: item.quantity,
        price: item.price
      })),
      totalAmount,
      shippingAddress
    });

    await order.save();

    // Cart clear karo
    cart.items = [];
    await cart.save();

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
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const getMyOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const orders = await Order.find({ userId: req.user!.id })
      .populate('items.productId')
      .sort({ createdAt: -1 });
    
    res.json(orders);
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
    const order = await Order.findById(req.params.id)
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
    const { page = '1', limit = '20', status, q } = req.query as any;
    const skip = (Number(page) - 1) * Number(limit);
    const filters: any = {};

    if (status) filters.status = status;
    if (q) {
      // allow searching by customer name or order id
      filters.$or = [
        { _id: q },
        { 'shippingAddress.street': new RegExp(q, 'i') }
      ];
    }

    const orders = await Order.find(filters)
      .populate('userId')
      .populate('assignedRiderId')
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
    const { id } = req.params;
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
      { assignedRiderId: riderId, status: 'processing' },
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
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

export const adminUpdateOrderStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const allowed = ['pending','processing','confirmed','shipped','delivered','cancelled'];
    if (!allowed.includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const before = await Order.findById(id);
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
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};
