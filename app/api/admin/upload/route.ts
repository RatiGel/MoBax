import { NextRequest } from 'next/server';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { uploadImage, deleteImage } from '@/lib/cloudinary';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export async function POST(req: NextRequest) {
  try {
    await requireAdmin({ module: 'products' });

    const formData = await req.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return fail('No file provided', 400);
    }
    if (!file.type.startsWith('image/')) {
      return fail('Only image files are allowed', 400);
    }
    if (file.size > MAX_FILE_SIZE) {
      return fail('File too large. Max size is 5 MB.', 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

    const uploaded = await uploadImage(dataUri);
    return ok(uploaded, 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/upload POST]', err);
    return fail('Failed to upload image', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAdmin({ module: 'products' });

    const publicId = req.nextUrl.searchParams.get('publicId');
    if (!publicId) {
      return fail('Missing publicId', 400);
    }

    await deleteImage(publicId);
    return ok({ deleted: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/upload DELETE]', err);
    return fail('Failed to delete image', 500);
  }
}
