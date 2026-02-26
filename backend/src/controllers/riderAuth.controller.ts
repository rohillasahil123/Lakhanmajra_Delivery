import {Request, Response} from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {Types} from 'mongoose';
import User from '../models/user.model';
import Order from '../models/order.model';

const JWT_SECRET = process.env.JWT_SECRET as string;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET is required');
}

const getRoleName = (user: any): string => {
  const role = user?.role || user?.roleName || user?.roleId?.name || user?.roleId;
  return String(role || '').toLowerCase();
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
      },
    });
  } catch (error) {
    res.status(500).json({message: 'Unable to validate rider token'});
  }
};

export const getRiderOrders = async (req: Request, res: Response): Promise<void> => {
  try {
    const riderId = String(req.user?._id || req.user?.id || '');

    if (!riderId) {
      res.status(401).json({message: 'Unauthorized'});
      return;
    }

    const orders = await Order.find({assignedRiderId: riderId})
      .populate('userId', 'name phone')
      .sort({createdAt: -1});

    res.status(200).json({orders});
  } catch (error) {
    res.status(500).json({message: 'Unable to fetch rider orders'});
  }
};