require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/user.model').default;

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/test';

async function seed() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to Mongo');

  const email = process.env.SUPERADMIN_EMAIL || 'superadmin@example.com';
  const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin123!';
  const existing = await User.findOne({ email });
  if (existing) {
    console.log('Superadmin already exists:', email);
    console.log('Current role:', existing.role);
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name: 'Super Admin', email, phone: '0000000000', password: hashed, role: 'superadmin' });
  console.log('Created superadmin:', user.email);
  console.log('Password:', password);
  process.exit(0);
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
