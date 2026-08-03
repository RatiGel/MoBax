import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/mongodb';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail, notFound } from '@/lib/api';
import { deleteImage } from '@/lib/cloudinary';
import Media from '@/models/Media';
import Product from '@/models/Product';
import Category from '@/models/Category';
import Service from '@/models/Service';

export const dynamic = 'force-dynamic';

type Params = { params: { id: string } };

function isValidId(id: string) {
  return mongoose.Types.ObjectId.isValid(id);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin({ module: 'media' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Media not found');

    const body = await req.json().catch(() => null);
    if (!body || typeof body.alt !== 'string') {
      return fail('alt (string) is required', 400);
    }
    const alt = body.alt.trim();
    if (alt.length > 500) {
      return fail('alt must be 500 characters or fewer', 400);
    }

    const media = await Media.findByIdAndUpdate(
      params.id,
      { alt },
      { new: true }
    ).lean();
    if (!media) return notFound('Media not found');

    return ok(media);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/media/:id PATCH]', err);
    return fail('Failed to update media', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await requireAdmin({ module: 'media' });
    await connectDB();
    if (!isValidId(params.id)) return notFound('Media not found');

    const media = await Media.findById(params.id).lean();
    if (!media) return notFound('Media not found');

    const [inProducts, inCategories, inServices] = await Promise.all([
      Product.countDocuments({ images: media.url }),
      Category.countDocuments({ image: media.url }),
      Service.countDocuments({ image: media.url }),
    ]);
    const usedBy = inProducts + inCategories + inServices;
    if (usedBy > 0 && req.nextUrl.searchParams.get('force') !== 'true') {
      return fail(`In use by ${usedBy} item(s). Re-send with force=true to delete anyway.`, 409);
    }

    await deleteImage(media.publicId);
    await Media.findByIdAndDelete(params.id);

    return ok({ deleted: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/media/:id DELETE]', err);
    return fail('Failed to delete media', 500);
  }
}
