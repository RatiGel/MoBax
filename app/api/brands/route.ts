import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Brand from '@/models/Brand';

export async function GET() {
  try {
    await connectDB();
    const brands = await Brand.find({}).lean();
    return NextResponse.json({ brands });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
