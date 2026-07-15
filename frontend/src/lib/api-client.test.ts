import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { AxiosInterceptorManager, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

const ORIGINAL_ENV = process.env.NEXT_PUBLIC_API_URL;

function getRequestHandler(manager: AxiosInterceptorManager<InternalAxiosRequestConfig>) {
  const handler = manager.handlers?.[0];
  if (!handler) throw new Error('No request interceptor registered');
  return handler;
}

function getResponseHandler(manager: AxiosInterceptorManager<AxiosResponse>) {
  const handler = manager.handlers?.[0];
  if (!handler) throw new Error('No response interceptor registered');
  return handler;
}

describe('apiClient', () => {
  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = ORIGINAL_ENV;
    vi.resetModules();
  });

  it('builds baseURL from NEXT_PUBLIC_API_URL when set', async () => {
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
    vi.resetModules();
    const { apiClient } = await import('./api-client');
    expect(apiClient.defaults.baseURL).toBe('https://api.example.com/api');
  });

  it('falls back to localhost:3000 when NEXT_PUBLIC_API_URL is not set', async () => {
    delete process.env.NEXT_PUBLIC_API_URL;
    vi.resetModules();
    const { apiClient } = await import('./api-client');
    expect(apiClient.defaults.baseURL).toBe('http://localhost:3000/api');
  });

  it('sets the JSON content-type header by default', async () => {
    vi.resetModules();
    const { apiClient } = await import('./api-client');
    expect(apiClient.defaults.headers['Content-Type']).toBe('application/json');
  });

  it('sets a 10s timeout', async () => {
    vi.resetModules();
    const { apiClient } = await import('./api-client');
    expect(apiClient.defaults.timeout).toBe(10000);
  });
});

describe('apiClient request interceptor', () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it('attaches the Authorization header when a token exists in localStorage', async () => {
    localStorage.setItem('token', 'abc123');
    const { apiClient } = await import('./api-client');

    const handler = getRequestHandler(apiClient.interceptors.request);
    const config = await handler.fulfilled({
      headers: {},
    } as InternalAxiosRequestConfig);

    expect(config.headers.Authorization).toBe('Bearer abc123');
  });

  it('does not attach an Authorization header when no token exists', async () => {
    const { apiClient } = await import('./api-client');

    const handler = getRequestHandler(apiClient.interceptors.request);
    const config = await handler.fulfilled({
      headers: {},
    } as InternalAxiosRequestConfig);

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('rejects the request when the interceptor error handler is invoked', async () => {
    const { apiClient } = await import('./api-client');
    const handler = getRequestHandler(apiClient.interceptors.request);
    const error = new Error('boom');

    await expect(handler.rejected?.(error)).rejects.toBe(error);
  });
});

describe('apiClient response interceptor', () => {
  const originalLocation = window.location;

  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, href: '' },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: originalLocation,
    });
  });

  it('passes through successful responses unchanged', async () => {
    const { apiClient } = await import('./api-client');
    const handler = getResponseHandler(apiClient.interceptors.response);
    const response = { status: 200, data: { ok: true } } as AxiosResponse;

    expect(handler.fulfilled(response)).toBe(response);
  });

  it('clears the token and redirects to /admin/login on a 401 response', async () => {
    localStorage.setItem('token', 'abc123');
    const { apiClient } = await import('./api-client');
    const handler = getResponseHandler(apiClient.interceptors.response);
    const error = { response: { status: 401 } };

    await expect(handler.rejected?.(error)).rejects.toBe(error);
    expect(localStorage.getItem('token')).toBeNull();
    expect(window.location.href).toBe('/admin/login');
  });

  it('does not touch the token or redirect on non-401 errors', async () => {
    localStorage.setItem('token', 'abc123');
    const { apiClient } = await import('./api-client');
    const handler = getResponseHandler(apiClient.interceptors.response);
    const error = { response: { status: 500 } };

    await expect(handler.rejected?.(error)).rejects.toBe(error);
    expect(localStorage.getItem('token')).toBe('abc123');
    expect(window.location.href).toBe('');
  });

  it('rejects without touching localStorage when there is no response object', async () => {
    localStorage.setItem('token', 'abc123');
    const { apiClient } = await import('./api-client');
    const handler = getResponseHandler(apiClient.interceptors.response);
    const error = new Error('network error');

    await expect(handler.rejected?.(error)).rejects.toBe(error);
    expect(localStorage.getItem('token')).toBe('abc123');
  });
});
