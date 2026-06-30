import { describe, it, expect } from 'vitest';
import { apiErrorMessage } from './error';

describe('apiErrorMessage', () => {
  it('returns the API response message when present', () => {
    const err = { response: { data: { message: 'Not found' } } };
    expect(apiErrorMessage(err, 'fallback')).toBe('Not found');
  });

  it('returns the fallback when err is null', () => {
    expect(apiErrorMessage(null, 'fallback')).toBe('fallback');
  });

  it('returns the fallback when response.data.message is empty', () => {
    const err = { response: { data: { message: '' } } };
    expect(apiErrorMessage(err, 'fallback')).toBe('fallback');
  });

  it('returns the fallback when response is missing', () => {
    expect(apiErrorMessage(new Error('raw'), 'fallback')).toBe('fallback');
  });

  it('returns the fallback when err is undefined', () => {
    expect(apiErrorMessage(undefined, 'fallback')).toBe('fallback');
  });
});
