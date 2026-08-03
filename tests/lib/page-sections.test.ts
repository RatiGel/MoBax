import { describe, it, expect } from 'vitest';
import { SECTION_SCHEMAS, emptyContent, validateSection } from '@/lib/page-sections';

describe('page sections', () => {
  it('defines a schema for every kind', () => {
    for (const kind of ['hero', 'text', 'banner', 'faq', 'grid'] as const) {
      expect(SECTION_SCHEMAS[kind].length).toBeGreaterThan(0);
    }
  });

  it('builds empty content with a key per bilingual side', () => {
    const c = emptyContent('hero');
    expect(c).toHaveProperty('headingEn');
    expect(c).toHaveProperty('headingKa');
  });

  it('accepts valid content', () => {
    expect(validateSection('text', { bodyEn: 'hi', bodyKa: 'გამარჯობა' }).ok).toBe(true);
  });

  it('rejects a missing required English field', () => {
    const r = validateSection('text', { bodyEn: '', bodyKa: 'გამარჯობა' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.join(' ')).toContain('bodyEn');
  });

  it('rejects an unknown kind', () => {
    expect(validateSection('nope' as never, {}).ok).toBe(false);
  });
});
