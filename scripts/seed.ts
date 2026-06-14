import mongoose from 'mongoose';
import { categories, products } from '../lib/mock-data';

const MONGODB_URI = process.env.MONGODB_URI!;

// Inline model definitions to avoid TS path alias issues in script context

const CategorySchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  nameEn: String,
  nameKa: String,
  icon: String,
  image: String,
  parentSlug: { type: String, default: null },
  productCount: { type: Number, default: 0 },
});

const BrandSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  logoUrl: { type: String, default: '' },
});

const ProductSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    nameEn: String,
    nameKa: String,
    descriptionEn: String,
    descriptionKa: String,
    price: Number,
    originalPrice: Number,
    sku: { type: String, unique: true },
    stock: { type: Number, default: 10 },
    categorySlug: String,
    brand: String,
    images: [String],
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isNewProduct: { type: Boolean, default: false },
    rating: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    specs: { type: Map, of: String, default: {} },
  },
  { timestamps: true }
);

async function seed() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const CategoryModel = mongoose.model('Category', CategorySchema);
  const BrandModel = mongoose.model('Brand', BrandSchema);
  const ProductModel = mongoose.model('Product', ProductSchema);

  // Clear existing
  await Promise.all([
    CategoryModel.deleteMany({}),
    BrandModel.deleteMany({}),
    ProductModel.deleteMany({}),
  ]);

  // Seed categories
  const catDocs = categories.map((c) => ({
    slug: c.slug,
    nameEn: c.nameEn,
    nameKa: c.nameKa,
    icon: c.icon,
    image: c.image,
    parentSlug: c.parentSlug || null,
    productCount: c.productCount,
  }));
  await CategoryModel.insertMany(catDocs);
  console.log(`Seeded ${catDocs.length} categories`);

  // Seed brands (unique from products)
  const brandNames = Array.from(new Set(products.map((p) => p.brand)));
  await BrandModel.insertMany(brandNames.map((name) => ({ name })));
  console.log(`Seeded ${brandNames.length} brands`);

  // Seed products
  const productDocs = products.map((p) => ({
    slug: p.slug,
    nameEn: p.nameEn,
    nameKa: p.nameKa,
    descriptionEn: p.descriptionEn,
    descriptionKa: p.descriptionKa,
    price: p.price,
    originalPrice: p.originalPrice,
    sku: p.sku,
    stock: p.inStock ? 50 : 0,
    categorySlug: p.category,
    brand: p.brand,
    images: p.images,
    isActive: true,
    isFeatured: p.isFeatured || false,
    isNewProduct: p.isNew || false,
    rating: p.rating,
    reviewCount: p.reviewCount,
    specs: p.specs,
  }));
  await ProductModel.insertMany(productDocs);
  console.log(`Seeded ${productDocs.length} products`);

  await mongoose.disconnect();
  console.log('Done');
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
