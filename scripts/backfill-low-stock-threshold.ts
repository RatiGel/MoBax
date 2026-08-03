/**
 * One-time migration — run with `npm run backfill:low-stock-threshold`.
 * Sets `lowStockThreshold` to the schema default on products that predate
 * the field (Mongoose defaults only apply to documents written through
 * Mongoose after the field was added, not to pre-existing documents).
 * Idempotent: only touches documents where the field is absent, so running
 * it again reports 0 updated.
 */
import mongoose from 'mongoose';
import Product, { DEFAULT_LOW_STOCK_THRESHOLD } from '../models/Product';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set. Run with: node --env-file=.env.local … (npm run backfill:low-stock-threshold handles this)');
  process.exit(1);
}

async function backfill() {
  await mongoose.connect(MONGODB_URI!);
  console.log('Connected to MongoDB');

  const result = await Product.updateMany(
    { lowStockThreshold: { $exists: false } },
    { $set: { lowStockThreshold: DEFAULT_LOW_STOCK_THRESHOLD } }
  );
  console.log(`Backfilled lowStockThreshold on ${result.modifiedCount} product(s).`);

  await mongoose.disconnect();
}

backfill().catch((err) => {
  console.error(err);
  process.exit(1);
});
