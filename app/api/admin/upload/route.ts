import { NextRequest } from 'next/server';
import { requireAdmin, AdminAuthError } from '@/lib/admin-auth';
import { ok, fail } from '@/lib/api';
import { connectDB } from '@/lib/mongodb';
import { uploadImage, deleteImage } from '@/lib/cloudinary';
import Media, { MEDIA_FOLDERS, type MediaFolder } from '@/models/Media';
import { canAccessModule, type AdminModule } from '@/lib/rbac';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

// Each folder is legitimately owned by more than one module in practice:
// `categories` images are uploaded both by STORE_MANAGER (who manages the
// `categories` module but not `content`) and by CONTENT_EDITOR (who manages
// `content`/`theme` but not `categories`). Mapping a folder to a single
// module always excludes one of its real owners, so the guard accepts ANY
// module in the list rather than exactly one.
const FOLDER_MODULES: Record<MediaFolder, AdminModule[]> = {
  products: ['products'],
  categories: ['categories', 'content'],
  services: ['content'],
  content: ['content'],
  theme: ['theme'],
};

function isMediaFolder(value: unknown): value is MediaFolder {
  return typeof value === 'string' && (MEDIA_FOLDERS as readonly string[]).includes(value);
}

/**
 * requireAdmin() only supports a single required module. Folders here can be
 * legitimately owned by more than one module (see FOLDER_MODULES), so we
 * establish the session with no module check, then OR-check ourselves.
 * Kept local to this route rather than extending requireAdmin's signature —
 * no other caller needs an OR-across-modules check today.
 */
async function requireAnyModule(modules: AdminModule[]) {
  const session = await requireAdmin();
  if (!modules.some((m) => canAccessModule(session.user.role, m))) {
    throw new AdminAuthError('Forbidden: insufficient role for this module', 403);
  }
  return session;
}

export async function POST(req: NextRequest) {
  try {
    // Only form-data parsing is allowed before the RBAC guard: the folder is
    // needed to pick the allowed modules, but it must be validated first — an
    // unvalidated folder could index FOLDER_MODULES with something arbitrary
    // and yield `undefined`, which would pass requireAnyModule() with an
    // empty list (vacuously true via `.some`) and no module check at all.
    const formData = await req.formData();
    const rawFolder = formData.get('folder');
    const candidate = rawFolder == null ? 'products' : rawFolder;

    if (!isMediaFolder(candidate)) {
      return fail('Invalid folder', 400);
    }
    const folder: MediaFolder = candidate; // narrowed by isMediaFolder above

    const session = await requireAnyModule(FOLDER_MODULES[folder]);

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

    // The Cloudinary asset already exists at this point. A failure to record
    // it as a Media document is a data-completeness problem, not a reason to
    // fail the user's upload — doing so would make them retry and orphan the
    // asset that already succeeded. Log and continue.
    try {
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
    } catch (mediaErr) {
      console.error('[admin/upload POST] Media.create failed', mediaErr);
    }

    return ok(uploaded, 201);
  } catch (err) {
    if (err instanceof AdminAuthError) return fail(err.message, err.status);
    console.error('[admin/upload POST]', err);
    // Surface Cloudinary's own message to the admin. This is a staff-only
    // route, and "Failed to upload image" gave no way to tell a misconfigured
    // deployment apart from a rejected file — a missing API key looked
    // identical to a bad upload for as long as it took to read the logs.
    const detail = err instanceof Error ? err.message : null;
    return fail(detail ? `Failed to upload image: ${detail}` : 'Failed to upload image', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const rawFolder = req.nextUrl.searchParams.get('folder');
    const candidate = rawFolder == null ? 'products' : rawFolder;

    if (!isMediaFolder(candidate)) {
      return fail('Invalid folder', 400);
    }
    const folder: MediaFolder = candidate; // narrowed by isMediaFolder above

    await requireAnyModule(FOLDER_MODULES[folder]);

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
