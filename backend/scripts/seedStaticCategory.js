require('dotenv').config();
const mongoose = require('mongoose');
const { Category } = require('../src/models/category.model');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/mobile';

async function seedCategory() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to Mongo');

  const name = 'Static Category';
  const slug = 'static-category';
  const existing = await Category.findOne({ slug });
  if (existing) {
    console.log('Category already exists:', existing._id);
    process.exit(0);
  }

  const category = await Category.create({ name, slug, priority: 0, isActive: true });
  console.log('Created category:', category._id);
  process.exit(0);
}

seedCategory().catch((e) => {
  console.error(e);
  process.exit(1);
});
