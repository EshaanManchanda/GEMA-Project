import { describe, it, expect } from 'vitest';
import { cn } from '@shared/utils/cn';

describe('cn', () => {
  it('joins classes', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters falsy values', () => {
    expect(cn('a', false, null, undefined, '', 'b')).toBe('a b');
  });

  it('handles conditional classes', () => {
    const isActive = true;
    expect(cn('base', isActive && 'active')).toBe('base active');
  });

  it('handles numbers as strings', () => {
    expect(cn('a', String(0), 'b')).toBe('a 0 b');
  });
});
