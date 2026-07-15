import { describe, it, expect, afterEach, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };

describe('constants', () => {
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.resetModules();
  });

  it('uses NEXT_PUBLIC_WHATSAPP_PHONE from env when set', async () => {
    process.env.NEXT_PUBLIC_WHATSAPP_PHONE = '5219999999999';
    vi.resetModules();
    const { WHATSAPP_PHONE } = await import('./constants');
    expect(WHATSAPP_PHONE).toBe('5219999999999');
  });

  it('falls back to the default WhatsApp phone when env var is not set', async () => {
    delete process.env.NEXT_PUBLIC_WHATSAPP_PHONE;
    vi.resetModules();
    const { WHATSAPP_PHONE } = await import('./constants');
    expect(WHATSAPP_PHONE).toBe('573123456789');
  });

  it('uses NEXT_PUBLIC_API_URL from env when set', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.crazycookies.test';
    vi.resetModules();
    const { API_URL } = await import('./constants');
    expect(API_URL).toBe('https://api.crazycookies.test');
  });

  it('falls back to localhost:3000 for API_URL when env var is not set', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.resetModules();
    const { API_URL } = await import('./constants');
    expect(API_URL).toBe('http://localhost:3000');
  });

  it('uses NEXT_PUBLIC_SITE_URL from env when set', async () => {
    process.env.NEXT_PUBLIC_SITE_URL = 'https://crazycookies.test';
    vi.resetModules();
    const { SITE_URL } = await import('./constants');
    expect(SITE_URL).toBe('https://crazycookies.test');
  });

  it('falls back to localhost:3001 for SITE_URL when env var is not set', async () => {
    delete process.env.NEXT_PUBLIC_SITE_URL;
    vi.resetModules();
    const { SITE_URL } = await import('./constants');
    expect(SITE_URL).toBe('http://localhost:3001');
  });

  it('exposes stable plain constants', async () => {
    vi.resetModules();
    const { SITE_NAME, SITE_DESCRIPTION, CART_STORAGE_KEY, SESSION_ID_KEY } =
      await import('./constants');
    expect(SITE_NAME).toBe('Crazy Cookies');
    expect(SITE_DESCRIPTION).toBe('Las mejores galletas y postres artesanales, hechos con amor');
    expect(CART_STORAGE_KEY).toBe('crazy-cookies-cart');
    expect(SESSION_ID_KEY).toBe('crazy-cookies-session');
  });
});
