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
}

/**
 * Upload an image to Cloudinary. Accepts a Node Buffer or a base64/data-URI string.
 * Returns the secure URL and the public_id (needed for later deletion).
 */
export async function uploadImage(
  file: Buffer | string,
  folder = 'mobax/products'
): Promise<UploadedImage> {
  const payload =
    typeof file === 'string'
      ? file
      : `data:application/octet-stream;base64,${file.toString('base64')}`;

  const result = await cloudinary.uploader.upload(payload, {
    folder,
    resource_type: 'image',
  });

  return { url: result.secure_url, publicId: result.public_id };
}

/** Remove an image from Cloudinary by its public_id. */
export async function deleteImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: 'image' });
}

export default cloudinary;
