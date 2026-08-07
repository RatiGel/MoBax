import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const uploadMock = vi.fn();
const destroyMock = vi.fn();
const configMock = vi.fn();

vi.mock('cloudinary', () => ({
  v2: {
    config: configMock,
    uploader: { upload: uploadMock, destroy: destroyMock },
  },
}));

const ENV = { ...process.env };
beforeEach(() => {
  vi.clearAllMocks();
  uploadMock.mockResolvedValue({
    secure_url: 'https://res.cloudinary.com/x/y.png',
    public_id: 'mobax/products/y',
    width: 1, height: 1, bytes: 10, format: 'png',
  });
});
afterEach(() => { process.env = { ...ENV }; });

describe('uploadImage', () => {
  it('reads credentials at call time, not at import time', async () => {
    // Import with the env EMPTY — this is the production failure mode.
    delete process.env.CLOUDINARY_CLOUD_NAME;
    delete process.env.CLOUDINARY_API_KEY;
    delete process.env.CLOUDINARY_API_SECRET;
    const { uploadImage } = await import('@/lib/cloudinary');

    // Credentials arrive only after the module was already loaded.
    process.env.CLOUDINARY_CLOUD_NAME = 'cn';
    process.env.CLOUDINARY_API_KEY = 'ak';
    process.env.CLOUDINARY_API_SECRET = 'as';

    await uploadImage('data:image/png;base64,AAA', 'products');

    expect(configMock).toHaveBeenCalledWith(
      expect.objectContaining({ cloud_name: 'cn', api_key: 'ak', api_secret: 'as' })
    );
  });

  it('names the missing variables instead of failing generically', async () => {
    vi.resetModules();
    const { uploadImage } = await import('@/lib/cloudinary');
    delete process.env.CLOUDINARY_API_KEY;
    process.env.CLOUDINARY_CLOUD_NAME = 'cn';
    process.env.CLOUDINARY_API_SECRET = 'as';

    await expect(uploadImage('data:image/png;base64,AAA')).rejects.toThrow(
      /missing CLOUDINARY_API_KEY/
    );
    expect(uploadMock).not.toHaveBeenCalled();
  });
});
