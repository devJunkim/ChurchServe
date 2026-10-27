import { HttpInterceptorFn } from '@angular/common/http';
import { inject, InjectionToken } from '@angular/core';

export interface RuntimeConfig {
  readonly apiBaseUrl: string;
  readonly release: string;
}

export const RUNTIME_CONFIG = new InjectionToken<RuntimeConfig>(
  'ChurchServe runtime configuration',
);

export async function loadRuntimeConfig(fetchConfig: typeof fetch = fetch): Promise<RuntimeConfig> {
  const response = await fetchConfig('/runtime-config.json', {
    cache: 'no-store',
    credentials: 'same-origin',
  });

  if (!response.ok) {
    throw new Error(`Runtime configuration returned HTTP ${response.status}.`);
  }

  return parseRuntimeConfig(await response.json());
}

export function parseRuntimeConfig(value: unknown): RuntimeConfig {
  if (!isRecord(value)) {
    throw new Error('Runtime configuration must be a JSON object.');
  }

  const apiBaseUrl = normalizeApiBaseUrl(value['apiBaseUrl']);
  const release = value['release'];
  if (typeof release !== 'string' || release.trim().length === 0 || release.length > 100) {
    throw new Error('Runtime configuration requires a non-empty release identifier.');
  }

  return { apiBaseUrl, release: release.trim() };
}

export const apiBaseUrlInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.url !== '/api' && !request.url.startsWith('/api/')) {
    return next(request);
  }

  const { apiBaseUrl } = inject(RUNTIME_CONFIG);
  return next(request.clone({ url: `${apiBaseUrl}${request.url.slice('/api'.length)}` }));
};

function normalizeApiBaseUrl(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('?') ||
    value.includes('#')
  ) {
    throw new Error('apiBaseUrl must be a same-origin absolute path.');
  }

  const normalized = value.length > 1 ? value.replace(/\/+$/, '') : value;
  if (normalized.length === 0) {
    throw new Error('apiBaseUrl must not be empty.');
  }

  return normalized;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
