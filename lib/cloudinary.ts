import { v2 as cloudinary } from 'cloudinary';

/**
 * Configure the SDK per call rather than once at module scope.
 *
 * A top-level `cloudinary.config({...})` is evaluated when the module is first
 * imported, which on Vercel can happen during the build — where the runtime
 * environment variables are not populated. The SDK then holds `api_key:
 * undefined` for the life of the serverless instance and every upload fails
 * with "Missing required parameter - api_key", even though the variables are
 * correctly set on the project. Reading `process.env` inside the request path
 * is what guarantees the real values.
 */
function configuredCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  // Fail with the missing names rather than letting the SDK report a generic
  // "Missing required parameter - api_key" that gives no hint which var to set.
  const missing = [
    !cloudName && 'CLOUDINARY_CLOUD_NAME',
    !apiKey && 'CLOUDINARY_API_KEY',
    !apiSecret && 'CLOUDINARY_API_SECRET',
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(`Cloudinary is not configured: missing ${missing.join(', ')}`);
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return cloudinary;
}

export interface UploadedImage {
  url: string;
  publicId: string;
  width: number;
  height: number;
  bytes: number;
  format: string;
}

/**
 * Upload an image to Cloudinary. Accepts a Node Buffer or a base64/data-URI string.
 * `folder` is the logical folder (e.g. "products", "categories") and is nested
 * under `mobax/`. Returns the secure URL, public_id (needed for later deletion),
 * and the asset's dimensions/size/format as reported by Cloudinary.
 */
export async function uploadImage(
  file: Buffer | string,
  folder = 'products'
): Promise<UploadedImage> {
  const payload =
    typeof file === 'string'
      ? file
      : `data:application/octet-stream;base64,${file.toString('base64')}`;

  const result = await configuredCloudinary().uploader.upload(payload, {
    folder: `mobax/${folder}`,
    resource_type: 'image',
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    bytes: result.bytes,
    format: result.format,
  };
}

/** Remove an image from Cloudinary by its public_id. */
export async function deleteImage(publicId: string): Promise<void> {
  await configuredCloudinary().uploader.destroy(publicId, { resource_type: 'image' });
}

// No default export: handing out the raw `cloudinary` singleton would let a
// caller use it without going through configuredCloudinary(), which is the
// only place the credentials are applied.
