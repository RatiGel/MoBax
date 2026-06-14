import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Category from '@/models/Category';

export async function GET() {
  try {
    await connectDB();
    const categories = await Category.find({}).lean();
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
