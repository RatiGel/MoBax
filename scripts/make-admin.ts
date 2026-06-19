/**
 * Upsert a SUPER_ADMIN user.
 * Run: node --env-file=.env.local --import tsx scripts/make-admin.ts
 * Idempotent — re-running resets the password + role.
 */
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from '../models/User';

const EMAIL = 'ratige12@gmail.com';
const PASSWORD = 'Rat1G1994';
const ROLE = 'SUPER_ADMIN';

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI not set');
    process.exit(1);
  }
  await mongoose.connect(uri);

  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const existing = await User.findOne({ email: EMAIL });
  if (existing) {
    existing.passwordHash = passwordHash;
    existing.role = ROLE;
    existing.isBlocked = false;
    if (!existing.firstName) existing.firstName = 'Rati';
    if (!existing.lastName) existing.lastName = 'Ge';
    await existing.save();
    console.log(`Updated ${EMAIL} → role=${ROLE}, password reset.`);
  } else {
    await User.create({
      email: EMAIL,
      passwordHash,
      firstName: 'Rati',
      lastName: 'Ge',
      role: ROLE,
      isBlocked: false,
    });
    console.log(`Created ${EMAIL} → role=${ROLE}.`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
