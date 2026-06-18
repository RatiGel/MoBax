/**
 * Seed script — run with `npm run seed`.
 * Wipes and repopulates: categories, brands, products (from lib/mock-data),
 * admin users (3 roles), sample customers, orders (date-spread for analytics),
 * and discount codes. Idempotent: safe to re-run.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { categories, products } from '../lib/mock-data';
import Category from '../models/Category';
import Brand from '../models/Brand';
import Product from '../models/Product';
import User from '../models/User';
import Order, { type OrderStatus, type PaymentStatus } from '../models/Order';
import Discount from '../models/Discount';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set. Run with: node --env-file=.env.local … (npm run seed handles this)');
  process.exit(1);
}

const ORDER_STATUSES: OrderStatus[] = [
  'PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED',
];

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function seed() {
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected to MongoDB');

  await Promise.all([
    Category.deleteMany({}),
    Brand.deleteMany({}),
    Product.deleteMany({}),
    User.deleteMany({}),
    Order.deleteMany({}),
    Discount.deleteMany({}),
  ]);
  console.log('Cleared collections');

  // ── Categories ──────────────────────────────────────────────
  await Category.insertMany(
    categories.map((c) => ({
      slug: c.slug,
      nameEn: c.nameEn,
      nameKa: c.nameKa,
      descriptionEn: `Browse our ${c.nameEn.toLowerCase()} collection — quality mobile accessories.`,
      descriptionKa: '',
      icon: c.icon,
      image: c.image,
      parentSlug: c.parentSlug || null,
      isActive: true,
      productCount: c.productCount,
    }))
  );
  console.log(`Seeded ${categories.length} categories`);

  // ── Brands ──────────────────────────────────────────────────
  const brandNames = Array.from(new Set(products.map((p) => p.brand)));
  await Brand.insertMany(brandNames.map((name) => ({ name })));
  console.log(`Seeded ${brandNames.length} brands`);

  // ── Products (vary stock so low-stock dashboard has data) ────
  const productDocs = products.map((p, i) => {
    // ~1 in 5 low or zero stock, rest healthy
    const stock = !p.inStock ? 0 : i % 5 === 0 ? Math.floor(Math.random() * 6) : 20 + ((i * 7) % 80);
    return {
      slug: p.slug,
      nameEn: p.nameEn,
      nameKa: p.nameKa,
      descriptionEn: p.descriptionEn,
      descriptionKa: p.descriptionKa,
      price: p.price,
      originalPrice: p.originalPrice,
      sku: p.sku,
      stock,
      categorySlug: p.category,
      brand: p.brand,
      tags: [p.brand.toLowerCase(), p.category],
      variants: [],
      images: p.images,
      isActive: true,
      isFeatured: p.isFeatured || false,
      isNewProduct: p.isNew || false,
      rating: p.rating,
      reviewCount: p.reviewCount,
      specs: p.specs,
    };
  });
  const insertedProducts = await Product.insertMany(productDocs);
  console.log(`Seeded ${insertedProducts.length} products`);

  // ── Users: admins + customers ───────────────────────────────
  const passwordHash = await bcrypt.hash('Admin1234', 10);
  const custHash = await bcrypt.hash('Customer1234', 10);

  const admins = await User.insertMany([
    { email: 'admin@mobax.ge', passwordHash, firstName: 'Nino', lastName: 'Beridze', role: 'SUPER_ADMIN' },
    { email: 'manager@mobax.ge', passwordHash, firstName: 'Giorgi', lastName: 'Kapanadze', role: 'STORE_MANAGER' },
    { email: 'editor@mobax.ge', passwordHash, firstName: 'Tamar', lastName: 'Lomidze', role: 'CONTENT_EDITOR' },
  ]);
  console.log(`Seeded ${admins.length} admin users (password: Admin1234)`);

  const customerSeeds = [
    ['luka.m@example.com', 'Luka', 'Maisuradze'],
    ['ana.k@example.com', 'Ana', 'Kvaratskhelia'],
    ['davit.t@example.com', 'Davit', 'Tsiklauri'],
    ['mariam.g@example.com', 'Mariam', 'Gelashvili'],
    ['zura.p@example.com', 'Zurab', 'Pertaia'],
    ['elene.b@example.com', 'Elene', 'Bakradze'],
    ['nika.j@example.com', 'Nika', 'Janelidze'],
    ['salome.d@example.com', 'Salome', 'Datunashvili'],
  ];
  const customers = await User.insertMany(
    customerSeeds.map(([email, firstName, lastName], i) => ({
      email,
      passwordHash: custHash,
      firstName,
      lastName,
      role: 'CUSTOMER',
      isBlocked: i === 7, // one blocked customer for testing
      createdAt: daysAgo(90 - i * 8),
    }))
  );
  console.log(`Seeded ${customers.length} customers (password: Customer1234)`);

  // ── Orders (spread over 90 days, realistic mix) ─────────────
  const cities = ['Tbilisi', 'Batumi', 'Kutaisi', 'Rustavi', 'Gori'];
  const orderDocs = [];
  for (let i = 0; i < 60; i++) {
    const customer = customers[i % customers.length];
    const itemCount = 1 + (i % 3);
    const items = [];
    let subtotal = 0;
    for (let j = 0; j < itemCount; j++) {
      const prod = insertedProducts[(i * 3 + j) % insertedProducts.length];
      const qty = 1 + (j % 2);
      subtotal += prod.price * qty;
      items.push({
        productId: prod._id.toString(),
        nameSnapshot: prod.nameEn,
        priceSnapshot: prod.price,
        quantity: qty,
        image: prod.images[0] || '',
      });
    }
    const shippingCost = subtotal >= 100 ? 0 : 5;
    const status = ORDER_STATUSES[i % ORDER_STATUSES.length];
    const paymentStatus: PaymentStatus =
      status === 'REFUNDED' ? 'REFUNDED' : status === 'CANCELLED' ? 'FAILED' : 'PAID';
    const createdAt = daysAgo(Math.floor((i / 60) * 90));
    orderDocs.push({
      userId: customer._id.toString(),
      status,
      paymentStatus,
      paymentMethod: i % 3 === 0 ? 'COD' : 'CARD',
      trackingNumber: ['SHIPPED', 'DELIVERED'].includes(status) ? `GE${100000 + i}` : undefined,
      subtotal,
      shippingCost,
      total: subtotal + shippingCost,
      addressSnapshot: {
        firstName: customer.firstName,
        lastName: customer.lastName,
        address: `${10 + i} Rustaveli Ave`,
        city: cities[i % cities.length],
        zipCode: `01${(i % 90) + 10}`,
        country: 'Georgia',
        phone: `+9955${(550000000 + i).toString()}`,
      },
      items,
      createdAt,
      updatedAt: createdAt,
    });
  }
  await Order.insertMany(orderDocs);
  console.log(`Seeded ${orderDocs.length} orders`);

  // ── Discounts ───────────────────────────────────────────────
  await Discount.insertMany([
    { code: 'WELCOME10', type: 'percentage', value: 10, minOrderAmount: 0, usageLimit: 1000, usageCount: 142, isActive: true },
    { code: 'SUMMER25', type: 'percentage', value: 25, minOrderAmount: 80, usageLimit: 500, usageCount: 67, expiresAt: daysAgo(-30), isActive: true },
    { code: 'FREESHIP', type: 'fixed', value: 5, minOrderAmount: 50, usageCount: 230, isActive: true },
    { code: 'EXPIRED5', type: 'fixed', value: 5, minOrderAmount: 0, usageCount: 12, expiresAt: daysAgo(10), isActive: false },
  ]);
  console.log('Seeded 4 discount codes');

  await mongoose.disconnect();
  console.log('\n✅ Seed complete.\n   Super admin: admin@mobax.ge / Admin1234');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
