import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

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

  const result = await cloudinary.uploader.upload(payload, {
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
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

export default cloudinary;
