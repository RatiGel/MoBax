import mongoose from 'mongoose';

// Unsplash stock that does not show what its category sells. Reviewed each
// image rather than clearing all of them: phone-protection (a case in hand),
// headphones-speakers (headphones) and computer-accessories (a keyboard) are
// accurate and stay. These three are not — `chargers` showed a bare Samsung
// phone, `car-accessories` a parked Fiat, `original` a laptop — and on a store
// whose first anti-reference is "cheap generic marketplace" a stock photo of
// the wrong product costs more trust than no photo. Clearing them lets the
// typographic fallback tile render, which reads as deliberate.
const CLEAR = ['chargers', 'car-accessories', 'original'];

async function main() {
  const dry = !process.argv.includes('--apply');
  await mongoose.connect(process.env.MONGODB_URI!);
  const col = mongoose.connection.db!.collection('categories');
  const docs = await col.find({ slug: { $in: CLEAR } }).toArray();
  console.log(dry ? '=== DRY RUN ===' : '=== APPLYING ===');
  for (const d of docs as any[]) console.log(`${d.slug}: "${(d.image||'').slice(0,70)}" -> ""`);
  if (!dry) {
    const r = await col.updateMany({ slug: { $in: CLEAR } }, { $set: { image: '' } });
    console.log('modified:', r.modifiedCount);
  }
  await mongoose.disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
