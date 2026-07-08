import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { logActivity } from '@/lib/activity';
import { UpdateServiceSchema } from '@/lib/validations';
import Service from '@/models/Service';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

async function update(req: NextRequest, { params }: Params) {
  const session = await requireAdmin({ module: 'content' });
  await connectDB();
  const json = await req.json();
  const parsed = UpdateServiceSchema.safeParse(json);
  if (!parsed.success) {
    return fail(parsed.error.issues[0]?.message ?? 'Invalid service data', 422);
  }
  const updated = await Service.findByIdAndUpdate(
    params.id,
    { $set: parsed.data },
    { new: true, runValidators: true }
  ).lean();
  if (!updated) return fail('Service not found', 404);
  await logActivity(session, 'service.update', 'Service', params.id, {});
  return ok(updated);
}

export async function PUT(req: NextRequest, ctx: Params) {
  try {
    return await update(req, ctx);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/services/:id PUT]', err);
    return fail('Failed to update service', 500);
  }
}

export async function PATCH(req: NextRequest, ctx: Params) {
  try {
    return await update(req, ctx);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/services/:id PATCH]', err);
    return fail('Failed to update service', 500);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await requireAdmin({ module: 'content' });
    await connectDB();
    const deleted = await Service.findByIdAndDelete(params.id).lean();
    if (!deleted) return fail('Service not found', 404);
    await logActivity(session, 'service.delete', 'Service', params.id, {});
    return ok({ id: params.id });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/services/:id DELETE]', err);
    return fail('Failed to delete service', 500);
  }
}
