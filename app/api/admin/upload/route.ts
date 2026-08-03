import { NextRequest } from 'next/server';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { connectDB } from '@/lib/mongodb';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import Media, { MEDIA_FOLDERS, type MediaFolder } from '@/models/Media';
import type { AdminModule } from '@/lib/rbac';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Note: `categories` intentionally maps to the `content` module, not
// `categories`. CONTENT_EDITOR only has `content` + `theme` (lib/rbac.ts) and
// cannot reach full category CRUD, but must still be able to upload a
// category image — image upload is a narrower capability than category
// management. Mapping it to `categories` would 403 the exact role this
// endpoint exists to unblock.
const FOLDER_MODULE: Record<MediaFolder, AdminModule> = {
  products: 'products',
  categories: 'content',
  services: 'content',
  content: 'content',
  theme: 'theme',
};

function isMediaFolder(value: unknown): value is MediaFolder {
  return typeof value === 'string' && (MEDIA_FOLDERS as readonly string[]).includes(value);
}

export async function POST(req: NextRequest) {
  try {
    // Only form-data parsing is allowed before the RBAC guard: the folder is
    // needed to pick the module, but it must be validated first — an
    // unvalidated folder could index FOLDER_MODULE with something arbitrary
    // and yield `undefined`, which would pass requireAdmin() with no module
    // check at all.
    const formData = await req.formData();
    const rawFolder = formData.get('folder');
    const folder: MediaFolder = rawFolder == null ? 'products' : (rawFolder as string) as MediaFolder;

    if (!isMediaFolder(folder)) {
      return fail('Invalid folder', 400);
    }

    const session = await requireAdmin({ module: FOLDER_MODULE[folder] });

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

    const uploaded = await uploadImage(dataUri, folder);

    await connectDB();
    await Media.create({
      url: uploaded.url,
      publicId: uploaded.publicId,
      folder,
      width: uploaded.width,
      height: uploaded.height,
      bytes: uploaded.bytes,
      format: uploaded.format,
      uploadedBy: session.user.id,
    });

    return ok(uploaded, 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/upload POST]', err);
    return fail('Failed to upload image', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const rawFolder = req.nextUrl.searchParams.get('folder');
    const folder: MediaFolder = rawFolder == null ? 'products' : (rawFolder as string) as MediaFolder;

    if (!isMediaFolder(folder)) {
      return fail('Invalid folder', 400);
    }

    await requireAdmin({ module: FOLDER_MODULE[folder] });

    const publicId = req.nextUrl.searchParams.get('publicId');
    if (!publicId) {
      return fail('Missing publicId', 400);
    }

    await deleteImage(publicId);

    await connectDB();
    await Media.deleteOne({ publicId });

    return ok({ deleted: true });
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/upload DELETE]', err);
    return fail('Failed to delete image', 500);
  }
}
