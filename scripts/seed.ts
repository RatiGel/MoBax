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
import Service from '../models/Service';
import ServicePage from '../models/ServicePage';

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
      _id: p.id,
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
        idNumber: `0100${(10000000 + i).toString()}`,
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

  // --- Services ---
  await Service.deleteMany({});
  await Service.insertMany([
    {
      titleEn: 'Applying Screen Films',
      titleKa: 'ეკრანის ფილმის დაფენა',
      descriptionEn: 'Professional application of protective screen film with a bubble-free, precise fit for your device.',
      descriptionKa: 'დამცავი ეკრანის ფილმის პროფესიონალური დაფენა — უბუშტო, ზუსტი მორგება თქვენი მოწყობილობისთვის.',
      image: '',
      order: 0,
      isActive: true,
    },
    {
      titleEn: 'Applying Leather Films',
      titleKa: 'ტყავის ფილმის დაფენა',
      descriptionEn: 'Premium leather-texture back film applied by hand for a refined grip and scratch protection.',
      descriptionKa: 'პრემიუმ ტყავის ტექსტურის ზურგის ფილმა, ხელით დაფენილი — დახვეწილი შეხება და ნაკაწრებისგან დაცვა.',
      image: '',
      order: 1,
      isActive: true,
    },
  ]);

  // --- Service page content ---
  await ServicePage.findOneAndUpdate(
    { key: 'services' },
    {
      $set: {
        key: 'services',
        headingEn: 'Invisible protection for your beloved device',
        headingKa: 'უხილავი დაცვა თქვენი საყვარელი მოწყობილობისთვის',
        introEn: 'Bring your device to MoBax and let our specialists apply premium protective films while you wait.',
        introKa: 'მოიტანეთ თქვენი მოწყობილობა MoBax-ში და ჩვენი სპეციალისტები დააფენენ პრემიუმ დამცავ ფილმებს ლოდინის გარეშე.',
        mapEmbedUrl:
          'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2409.147724542609!2d44.815260175260974!3d41.792993271251156!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40446d0060083acf%3A0x7925389d80f40bdd!2sMOBAX%20-%20phone%20accessories!5e1!3m2!1sen!2sge!4v1783496076755!5m2!1sen!2sge',
        addressEn: 'MOBAX — phone accessories, Tbilisi',
        addressKa: 'MOBAX — ტელეფონის აქსესუარები, თბილისი',
      },
    },
    { upsert: true, setDefaultsOnInsert: true }
  );
  console.log('Seeded services + service page');

  await mongoose.disconnect();
  console.log('\n✅ Seed complete.\n   Super admin: admin@mobax.ge / Admin1234');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
