import { describe, it, expect } from 'vitest';
import { formatPrice } from './format';

describe('formatPrice', () => {
  it('formats zero', () => {
    expect(formatPrice(0)).toBe('$0.00');
  });

  it('formats an exact integer', () => {
    expect(formatPrice(10)).toBe('$10.00');
  });

  it('formats numbers with thousands separators', () => {
    expect(formatPrice(14280)).toBe('$14,280.00');
  });

  it('rounds long decimals to 2 places', () => {
    expect(formatPrice(14820.567)).toBe('$14,820.57');
  });

  it('rounds down when the third decimal is less than 5', () => {
    expect(formatPrice(9.994)).toBe('$9.99');
  });

  it('formats negative values', () => {
    expect(formatPrice(-25.5)).toBe('-$25.50');
  });

  it('formats string numeric input', () => {
    expect(formatPrice('42.5')).toBe('$42.50');
  });

  it('formats a value with a single decimal by padding to 2 places', () => {
    expect(formatPrice(5.1)).toBe('$5.10');
  });

  it('formats large numbers with multiple thousand separators', () => {
    expect(formatPrice(1234567.891)).toBe('$1,234,567.89');
  });
});
