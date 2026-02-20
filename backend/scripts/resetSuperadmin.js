require('dotenv').config({ path: '/home/akash/Lakhanmajra_Delivery/backend/.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/lakhanmajra';

// ⚠️ Safety check: This script DELETES the existing superadmin user and creates a new one
// Only run this if you want to reset the superadmin account
// To confirm, pass FORCE_RESET=true as environment variable

async function resetSuperadmin() {
  try {
    // Check if user confirmed the reset
    if (process.env.FORCE_RESET !== 'true') {
      console.log('\n⚠️  WARNING: This script will DELETE the existing superadmin user!');
      console.log('To confirm, run: FORCE_RESET=true npm run reset-superadmin\n');
      process.exit(1);
    }

    await mongoose.connect(MONGO);
    console.log('✅ Connected to MongoDB');

    const { Role } = require('../src/models/role.model');
    const User = require('../src/models/user.model').default;

    // Get superadmin role
    const superadminRole = await Role.findOne({ name: 'superadmin' });
    if (!superadminRole) {
      console.log('❌ Superadmin role not found. Run seed first.');
      process.exit(1);
    }

    // Delete existing superadmin user
    const deletedCount = await User.deleteOne({ email: 'superadmin@example.com' });
    if (deletedCount.deletedCount > 0) {
      console.log('🗑️  Deleted old superadmin user');
    } else {
      console.log('ℹ️  No existing superadmin found');
    }

    // Create fresh superadmin
    const password = 'superadmin@123';
    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = await User.create({
      name: 'Super Admin',
      email: 'superadmin@example.com',
      phone: '0000000000',
      password: hashedPassword,
      roleId: superadminRole._id,
      isActive: true,
    });

    console.log('\n✅ New Superadmin Created!');
    console.log('📝 Email: superadmin@example.com');
    console.log('🔑 Password: superadmin@123');
    console.log('👤 Role: superadmin');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

resetSuperadmin();
