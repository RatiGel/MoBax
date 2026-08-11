/**
 * One-time migration — run with `npm run fix:slugs` (add `-- --apply` to write).
 *
 * Products created through the admin panel stored the Slug field verbatim,
 * because the create route only called slugify() when the field was blank and
 * the update route never called it at all. That put values like
 * "IPhone 16 Pro Max Case" and "USB-C to Lightning Cable (1 m)" in the
 * database. The storefront resolves /[locale]/products/[slug] by exact match,
 * so every one of those products 404'd when clicked.
 *
 * The routes now normalize through the schema, but existing rows still hold the
 * bad values — this rewrites them.
 *
 * Defaults to a DRY RUN that only prints the planned changes. Pass --apply to
 * write. Idempotent: slugify() is a no-op on an already-clean slug, so a second
 * run reports 0 changes.
 *
 * Collisions: if two products normalize to the same slug, the first keeps it
 * and later ones get a -2, -3, … suffix rather than failing the unique index.
 */
import mongoose from 'mongoose';
import Product from '../models/Product';
import { slugify } from '../lib/utils';

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('MONGODB_URI not set. Use: npm run fix:slugs');
  process.exit(1);
}

const APPLY = process.argv.includes('--apply');

async function run() {
  await mongoose.connect(MONGODB_URI!);
  console.log(`Connected. Mode: ${APPLY ? 'APPLY (writing)' : 'DRY RUN (no writes)'}\n`);

  const products = await Product.find({}, { slug: 1, nameEn: 1 }).lean();

  // Seed the taken-set with slugs that are already correct, so a rewrite never
  // collides with a product we aren't touching.
  const taken = new Set<string>();
  const planned: { id: string; from: string; to: string; name: string }[] = [];

  for (const p of products) {
    const current = String(p.slug ?? '');
    if (current && slugify(current) === current) taken.add(current);
  }

  for (const p of products) {
    const current = String(p.slug ?? '');
    let next = slugify(current) || slugify(String(p.nameEn ?? ''));

    if (!next) {
      console.warn(`  SKIP ${String(p._id)} — cannot derive a slug from "${current}" / "${p.nameEn}"`);
      continue;
    }
    if (next === current) continue; // Already clean.

    // De-duplicate against both untouched and already-planned slugs.
    if (taken.has(next)) {
      let n = 2;
      while (taken.has(`${next}-${n}`)) n++;
      next = `${next}-${n}`;
    }
    taken.add(next);
    planned.push({ id: String(p._id), from: current, to: next, name: String(p.nameEn ?? '') });
  }

  if (planned.length === 0) {
    console.log('Nothing to fix — every slug is already URL-safe.');
  } else {
    console.log(`${planned.length} product(s) need a new slug:\n`);
    for (const c of planned) console.log(`  ${c.from}\n    -> ${c.to}`);

    if (APPLY) {
      console.log('\nWriting…');
      for (const c of planned) {
        await Product.updateOne({ _id: c.id }, { $set: { slug: c.to } });
      }
      console.log(`Updated ${planned.length} product(s).`);
    } else {
      console.log('\nDry run — nothing written. Re-run with: npm run fix:slugs -- --apply');
    }
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
