require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/mobile';

async function seed() {
  try {
    await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('✅ Connected to MongoDB');

    // Import models after connecting
    const { Permission } = require('../src/models/permission.model');
    const { Role } = require('../src/models/role.model');
    const User = require('../src/models/user.model').default;

    // Step 1: Clear existing data (optional - remove if you want to preserve)
    // await Permission.deleteMany({});
    // await Role.deleteMany({});
    console.log('📍 Starting seed process...');

    // Step 2: Define all permissions
    const permissions = [
      // Product permissions
      { name: 'products:view', description: 'View products', resource: 'products', action: 'view' },
      { name: 'products:create', description: 'Create products', resource: 'products', action: 'create' },
      { name: 'products:update', description: 'Update products', resource: 'products', action: 'update' },
      { name: 'products:delete', description: 'Delete products', resource: 'products', action: 'delete' },
      
      // Category permissions
      { name: 'categories:view', description: 'View categories', resource: 'categories', action: 'view' },
      { name: 'categories:create', description: 'Create categories', resource: 'categories', action: 'create' },
      { name: 'categories:update', description: 'Update categories', resource: 'categories', action: 'update' },
      { name: 'categories:delete', description: 'Delete categories', resource: 'categories', action: 'delete' },
      
      // Order permissions
      { name: 'orders:view', description: 'View orders', resource: 'orders', action: 'view' },
      { name: 'orders:create', description: 'Create orders', resource: 'orders', action: 'create' },
      { name: 'orders:update', description: 'Update orders', resource: 'orders', action: 'update' },
      { name: 'orders:assign', description: 'Assign orders to riders', resource: 'orders', action: 'assign' },
      
      // User management permissions
      { name: 'users:view', description: 'View users', resource: 'users', action: 'view' },
      { name: 'users:create', description: 'Create users', resource: 'users', action: 'create' },
      { name: 'users:update', description: 'Update users', resource: 'users', action: 'update' },
      { name: 'users:delete', description: 'Delete users', resource: 'users', action: 'delete' },
      
      // Role & permission management
      { name: 'roles:manage', description: 'Manage roles and permissions', resource: 'roles', action: 'manage' },
      
      // Reports
      { name: 'reports:view', description: 'View reports', resource: 'reports', action: 'view' },
    ];

    // Create permissions
    const createdPermissions = {};
    for (const perm of permissions) {
      let existing = await Permission.findOne({ name: perm.name });
      if (!existing) {
        const p = await Permission.create(perm);
        createdPermissions[perm.name] = p._id;
        console.log(`✓ Created permission: ${perm.name}`);
      } else {
        createdPermissions[perm.name] = existing._id;
        console.log(`→ Permission already exists: ${perm.name}`);
      }
    }

    // Step 3: Define roles with permissions (Blinkit-style)
    const roles = [
      {
        name: 'superadmin',
        description: 'Super admin - full system access',
        permissions: Object.values(createdPermissions),
      },
      {
        name: 'admin',
        description: 'Admin - manage store, products, categories, orders',
        permissions: [
          createdPermissions['products:create'],
          createdPermissions['products:update'],
          createdPermissions['products:view'],
          createdPermissions['categories:create'],
          createdPermissions['categories:update'],
          createdPermissions['categories:view'],
          createdPermissions['orders:view'],
          createdPermissions['orders:update'],
          createdPermissions['users:view'],
          createdPermissions['reports:view'],
        ],
      },
      {
        name: 'manager',
        description: 'Manager - manage products and categories (no delete)',
        permissions: [
          createdPermissions['products:view'],
          createdPermissions['products:create'],
          createdPermissions['products:update'],
          createdPermissions['categories:view'],
          createdPermissions['categories:create'],
          createdPermissions['categories:update'],
          createdPermissions['reports:view'],
        ],
      },
      {
        name: 'vendor',
        description: 'Vendor - manage own products',
        permissions: [
          createdPermissions['products:view'],
          createdPermissions['products:create'],
          createdPermissions['products:update'],
          createdPermissions['categories:view'],
        ],
      },
      {
        name: 'rider',
        description: 'Delivery rider - manage assigned orders',
        permissions: [
          createdPermissions['orders:view'],
          createdPermissions['orders:update'],
        ],
      },
      {
        name: 'user',
        description: 'Regular customer',
        permissions: [
          createdPermissions['orders:create'],
          createdPermissions['orders:view'],
          createdPermissions['products:view'],
          createdPermissions['categories:view'],
        ],
      },
    ];

    // Create roles
    const createdRoles = {};
    for (const role of roles) {
      let existing = await Role.findOne({ name: role.name });
      if (!existing) {
        const r = await Role.create(role);
        createdRoles[role.name] = r;
        console.log(`✓ Created role: ${role.name}`);
      } else {
        createdRoles[role.name] = existing;
        console.log(`→ Role already exists: ${role.name}`);
      }
    }

    // Step 4: Create/update superadmin user
    const superadminEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@example.com';
    const superadminPassword = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@123';

    let superadminUser = await User.findOne({ email: superadminEmail });
    if (!superadminUser) {
      const hashed = await bcrypt.hash(superadminPassword, 10);
      superadminUser = await User.create({
        name: 'Super Admin',
        email: superadminEmail,
        phone: '0000000000',
        password: hashed,
        roleId: createdRoles['superadmin']._id,
        isActive: true,
      });
      console.log(`✓ Created superadmin user: ${superadminEmail}`);
    } else {
      console.log(`→ Superadmin user already exists: ${superadminEmail}`);
    }

    console.log('\n✅ Seed completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log(`Email: ${superadminEmail}`);
    console.log(`Password: ${superadminPassword}`);
    console.log('\n📊 Seeded:');
    console.log(`- Permissions: ${Object.keys(createdPermissions).length}`);
    console.log(`- Roles: ${Object.keys(createdRoles).length}`);
    console.log(`- Users: 1 (superadmin)`);

    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err);
    process.exit(1);
  }
}

seed();
