import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import Product from '@/models/Product';

const LIMIT = 10;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const q = (searchParams.get('q') || '').trim();

    if (q.length < 1) {
      return NextResponse.json({ products: [] });
    }

    await connectDB();

    const rx = new RegExp(escapeRegex(q), 'i');
    const projection = 'slug nameEn nameKa price images brand';

    const products = await Product.find({
      isActive: true,
      $or: [{ nameEn: rx }, { nameKa: rx }, { brand: rx }, { tags: rx }],
    })
      .select(projection)
      .limit(LIMIT * 3) // over-fetch a little so the relevance sort has room to work
      .lean();

    // Simple relevance heuristic: name matches rank above brand/tag-only matches.
    const ranked = products
      .map((p) => {
        const inName = rx.test(p.nameEn) || rx.test(p.nameKa);
        return { p, score: inName ? 1 : 0 };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, LIMIT)
      .map(({ p }) => ({
        slug: p.slug,
        nameEn: p.nameEn,
        nameKa: p.nameKa,
        price: p.price,
        image: p.images?.[0] ?? '',
        brand: p.brand,
      }));

    return NextResponse.json({ products: ranked });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
