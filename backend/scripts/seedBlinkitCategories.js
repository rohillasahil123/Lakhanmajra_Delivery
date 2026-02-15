require('dotenv').config();
const mongoose = require('mongoose');
const { Category } = require('../src/models/category.model');

const MONGO = process.env.MONGO_URI || 'mongodb://localhost:27017/mobile';

const categories = [
  { name: 'Grocery', slug: 'grocery', subs: ['Fruits', 'Vegetables', 'Herbs', 'Seasonings'] },
  { name: 'Dairy & Breakfast', slug: 'dairy-breakfast', subs: ['Milk', 'Curd / Yogurt', 'Butter', 'Cheese', 'Bread & Buns', 'Eggs', 'Cereals & Oats'] },
  { name: 'Snacks & Branded Foods', slug: 'snacks-branded-foods', subs: ['Chips', 'Namkeen', 'Biscuits', 'Cookies', 'Chocolates', 'Candies', 'Noodles', 'Pasta', 'Ready-to-Eat Food'] },
  { name: 'Staples', slug: 'staples', subs: ['Atta', 'Rice', 'Dal', 'Pulses', 'Cooking Oil', 'Ghee', 'Sugar', 'Salt', 'Jaggery'] },
  { name: 'Masala & Dry Fruits', slug: 'masala-dry-fruits', subs: ['Whole Spices', 'Powdered Spices', 'Dry Fruits', 'Nuts', 'Seeds'] },
  { name: 'Beverages', slug: 'beverages', subs: ['Tea', 'Coffee', 'Soft Drinks', 'Juices', 'Energy Drinks'] },
  { name: 'Household Essentials', slug: 'household-essentials', subs: ['Detergents', 'Dishwash Liquid', 'Floor Cleaner', 'Toilet Cleaner', 'Garbage Bags'] },
  { name: 'Personal Care', slug: 'personal-care', subs: ['Soap', 'Body Wash', 'Shampoo', 'Hair Oil', 'Toothpaste', 'Oral Care', 'Skin Care'] },
  { name: 'Baby Care', slug: 'baby-care', subs: ['Diapers', 'Baby Food', 'Baby Wipes', 'Baby Skincare'] },
  { name: 'Pet Care', slug: 'pet-care', subs: ['Dog Food', 'Cat Food', 'Pet Accessories'] },
  { name: 'Frozen & Ice Cream', slug: 'frozen-ice-cream', subs: ['Ice Cream', 'Frozen Snacks', 'Frozen Vegetables'] },
  { name: 'Instant / Ready Meals', slug: 'instant-ready-meals', subs: ['Instant Poha', 'Ready Curries', 'Cup Noodles'] },
  { name: 'Paan Corner', slug: 'paan-corner', subs: ['Cigarettes', 'Paan Masala', 'Lighters'] },
];

async function seedCategories() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to Mongo');

  for (const cat of categories) {
    let main = await Category.findOne({ slug: cat.slug });
    if (!main) {
      main = await Category.create({ name: cat.name, slug: cat.slug, priority: 0, isActive: true });
      console.log('Created main category:', main.name);
    }
    for (const sub of cat.subs) {
      const subSlug = sub.toLowerCase().replace(/\s+/g, '-').replace(/\//g, '-');
      let subcat = await Category.findOne({ slug: subSlug, parentCategory: main._id });
      if (!subcat) {
        subcat = await Category.create({ name: sub, slug: subSlug, parentCategory: main._id, priority: 0, isActive: true });
        console.log('  Created subcategory:', sub);
      }
    }
  }
  process.exit(0);
}

seedCategories().catch((e) => {
  console.error(e);
  process.exit(1);
});
