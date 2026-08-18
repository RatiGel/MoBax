import { describe, it, expect } from 'vitest';
import { SocialVideoSettingsSchema } from '@/lib/validations';
import { parseTikTokId } from '@/components/shop/SocialVideos';

describe('parseTikTokId', () => {
  it('reads the id from a canonical video URL', () => {
    expect(parseTikTokId('https://www.tiktok.com/@mobax.ge/video/7016671030340078854')).toBe(
      '7016671030340078854'
    );
  });

  it('reads the id from an embed URL', () => {
    expect(parseTikTokId('https://www.tiktok.com/embed/v2/1234567890')).toBe('1234567890');
  });

  it('tolerates query strings and trailing segments', () => {
    expect(parseTikTokId('https://www.tiktok.com/@x/video/999?is_from_webapp=1')).toBe('999');
  });

  // Short share links can't be resolved without a network round-trip. Returning
  // null is what makes the component fall back to a link card instead of
  // rendering an embed that would stay permanently blank.
  it('returns null for a short share link', () => {
    expect(parseTikTokId('https://vm.tiktok.com/ZMabcdef/')).toBeNull();
  });

  it('returns null for a non-video TikTok URL', () => {
    expect(parseTikTokId('https://www.tiktok.com/@mobax.ge')).toBeNull();
  });
});

describe('SocialVideoSettingsSchema', () => {
  const video = {
    id: 'a',
    url: 'https://www.tiktok.com/@mobax.ge/video/123',
    captionEn: '',
    captionKa: '',
  };

  it('accepts tiktok.com video URLs', () => {
    const r = SocialVideoSettingsSchema.safeParse({ handle: '', profileUrl: '', videos: [video] });
    expect(r.success).toBe(true);
  });

  // The storefront renders these URLs as third-party embeds, so accepting an
  // arbitrary origin here would let an admin-entered value load a script-bearing
  // iframe from anywhere.
  it('rejects a non-TikTok URL', () => {
    const r = SocialVideoSettingsSchema.safeParse({
      handle: '',
      profileUrl: '',
      videos: [{ ...video, url: 'https://example.com/evil' }],
    });
    expect(r.success).toBe(false);
  });

  it('rejects a http (non-https) TikTok URL', () => {
    const r = SocialVideoSettingsSchema.safeParse({
      handle: '',
      profileUrl: '',
      videos: [{ ...video, url: 'http://www.tiktok.com/@x/video/1' }],
    });
    expect(r.success).toBe(false);
  });

  it('allows an empty profile URL but rejects a foreign one', () => {
    expect(
      SocialVideoSettingsSchema.safeParse({ handle: '', profileUrl: '', videos: [] }).success
    ).toBe(true);
    expect(
      SocialVideoSettingsSchema.safeParse({
        handle: '',
        profileUrl: 'https://example.com',
        videos: [],
      }).success
    ).toBe(false);
  });

  it('accepts an empty video list — the section just hides itself', () => {
    const r = SocialVideoSettingsSchema.safeParse({ handle: '', profileUrl: '', videos: [] });
    expect(r.success).toBe(true);
  });
});
