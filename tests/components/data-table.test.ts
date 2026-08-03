import { describe, it, expect } from 'vitest';
import { defaultGetRowId } from '@/components/admin/DataTable';

describe('defaultGetRowId', () => {
  it('resolves `id`', () => {
    expect(defaultGetRowId({ id: 'a' })).toBe('a');
  });

  it('resolves `_id` when `id` is absent', () => {
    expect(defaultGetRowId({ _id: 'b' })).toBe('b');
  });

  it('prefers `id` when both are present', () => {
    expect(defaultGetRowId({ id: 'a', _id: 'b' })).toBe('a');
  });

  it('throws when neither key is present, rather than collapsing rows onto "undefined"', () => {
    expect(() => defaultGetRowId({})).toThrow(/requires each row to have/);
  });
});
