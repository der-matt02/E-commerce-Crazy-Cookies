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

  it('returns the fallback when response.data is missing', () => {
    const err = { response: {} };
    expect(apiErrorMessage(err, 'fallback')).toBe('fallback');
  });

  it('returns the fallback when err is a plain string', () => {
    expect(apiErrorMessage('some string error', 'fallback')).toBe('fallback');
  });

  it('returns the fallback when err is a number', () => {
    expect(apiErrorMessage(42, 'fallback')).toBe('fallback');
  });

  it('returns the message when response.data.message is a non-empty string with whitespace', () => {
    const err = { response: { data: { message: '  Server exploded  ' } } };
    expect(apiErrorMessage(err, 'fallback')).toBe('  Server exploded  ');
  });

  it('returns the fallback when response.data.message is null', () => {
    const err = { response: { data: { message: null } } };
    expect(apiErrorMessage(err, 'fallback')).toBe('fallback');
  });

  it('returns the fallback when err is an empty object', () => {
    expect(apiErrorMessage({}, 'fallback')).toBe('fallback');
  });
});
