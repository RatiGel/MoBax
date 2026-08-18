import mongoose from 'mongoose';

// Canonical casing for the brand strings that exist in the catalogue. Chosen to
// match each vendor's own capitalization; "No brand" is the display form used
// for unbranded stock.
const CANON: Record<string, string> = {
  'apple': 'Apple',
  'hoco': 'Hoco',
  'no brand': 'No brand',
  'samsung': 'Samsung',
  'xiaomi': 'Xiaomi',
  'google': 'Google',
  'anker': 'Anker',
  'baseus': 'Baseus',
  'jbl': 'JBL',
  'logitech': 'Logitech',
  'borofone': 'Borofone',
  'marshall': 'Marshall',
  'mobax': 'MoBax',
};

async function main() {
  const dry = !process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI!);
  const col = mongoose.connection.db!.collection('products');
  const prods = await col.find({}, { projection: { brand: 1 } }).toArray();

  const plan: { id: any; from: string; to: string }[] = [];
  for (const p of prods as any[]) {
    if (typeof p.brand !== 'string' || !p.brand.trim()) continue;
    const key = p.brand.trim().toLowerCase();
    const target = CANON[key] ?? p.brand.trim();
    if (target !== p.brand) plan.push({ id: p._id, from: p.brand, to: target });
  }

  console.log(dry ? '=== DRY RUN ===' : '=== APPLYING ===');
  const summary: Record<string, number> = {};
  for (const c of plan) summary[`${c.from} -> ${c.to}`] = (summary[`${c.from} -> ${c.to}`] || 0) + 1;
  console.log(JSON.stringify(summary, null, 1));
  console.log('docs to change:', plan.length);

  if (!dry) {
    for (const c of plan) await col.updateOne({ _id: c.id }, { $set: { brand: c.to } });
    const after = await col.distinct('brand');
    console.log('brands after:', after.sort());
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
