require('dotenv').config({ path: '/home/akash/Lakhanmajra_Delivery/backend/.env' });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/lakhanmajra';

async function resetSuperadmin() {
  try {
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
    await User.deleteOne({ email: 'superadmin@example.com' });
    console.log('🗑️  Deleted old superadmin user');

    // Create fresh superadmin
    const password = 'SuperAdmin@123';
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
    console.log('🔑 Password: SuperAdmin@123');
    console.log('👤 Role: superadmin');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

resetSuperadmin();
