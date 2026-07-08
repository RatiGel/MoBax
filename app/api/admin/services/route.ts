import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { CreateServiceSchema } from '@/lib/validations';
import Service from '@/models/Service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireAdmin({ module: 'content' });
    await connectDB();
    const services = await Service.find().sort({ order: 1, createdAt: 1 }).lean();
    return ok({ services });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/services GET]', err);
    return fail('Failed to load services', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin({ module: 'content' });
    await connectDB();
    const json = await req.json();
    const parsed = CreateServiceSchema.safeParse(json);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? 'Invalid service data', 422);
    }
    const created = await Service.create(parsed.data);
    await logActivity(session, 'service.create', 'Service', String(created._id), {
      titleEn: created.titleEn,
    });
    return ok(created.toObject(), 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/services POST]', err);
    return fail('Failed to create service', 500);
  }
}
