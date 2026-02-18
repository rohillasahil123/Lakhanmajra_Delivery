import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { Role } from '../src/models/role.model';
import User from '../src/models/user.model';

dotenv.config();

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/lakhanmajra';

async function resetSuperadmin() {
  try {
    await mongoose.connect(MONGO);
    console.log('✅ Connected to MongoDB');

    const superadminRole = await Role.findOne({ name: 'superadmin' });
    if (!superadminRole) {
      console.log('❌ Superadmin role not found. Run seed first.');
      process.exit(1);
    }

    await User.deleteOne({ email: 'superadmin@example.com' });
    console.log('🗑️  Deleted old superadmin user');

    const password = 'SuperAdmin@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    await User.create({
      name: 'Super Admin',
      email: 'superadmin@example.com',
      phone: '0000000000',
      password: hashedPassword,
      roleId: superadminRole._id,
      isActive: true,
    });

    console.log('\n✅ New Superadmin Created!');
    console.log('📝 Email: superadmin@example.com');
    console.log('🔑 Password: SuperAdmin@123');
    console.log('👤 Role: superadmin');

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

resetSuperadmin();
