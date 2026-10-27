import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import {
  apiBaseUrlInterceptor,
  loadRuntimeConfig,
  parseRuntimeConfig,
  RUNTIME_CONFIG,
} from './runtime-config';

describe('runtime configuration', () => {
  it('loads and validates the public configuration without using a browser cache', async () => {
    const fetchConfig = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ apiBaseUrl: '/church-api/', release: '2026.10.25.1' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    await expect(loadRuntimeConfig(fetchConfig)).resolves.toEqual({
      apiBaseUrl: '/church-api',
      release: '2026.10.25.1',
    });
    expect(fetchConfig).toHaveBeenCalledWith('/runtime-config.json', {
      cache: 'no-store',
      credentials: 'same-origin',
    });
  });

  it.each(['https://api.example', '//api.example', '/api?tenant=one', '/api#fragment'])(
    'rejects unsafe API base URL %s',
    (apiBaseUrl) => {
      expect(() => parseRuntimeConfig({ apiBaseUrl, release: 'test' })).toThrow(
        'apiBaseUrl must be a same-origin absolute path.',
      );
    },
  );

  it('rejects an unsuccessful configuration response', async () => {
    const fetchConfig = vi.fn().mockResolvedValue(new Response(null, { status: 503 }));

    await expect(loadRuntimeConfig(fetchConfig)).rejects.toThrow(
      'Runtime configuration returned HTTP 503.',
    );
  });

  it('requires a release identifier', () => {
    expect(() => parseRuntimeConfig({ apiBaseUrl: '/api', release: ' ' })).toThrow(
      'Runtime configuration requires a non-empty release identifier.',
    );
  });

  it('rewrites API requests and leaves non-API requests unchanged', () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: RUNTIME_CONFIG, useValue: { apiBaseUrl: '/church-api', release: 'test' } },
        provideHttpClient(withInterceptors([apiBaseUrlInterceptor])),
        provideHttpClientTesting(),
      ],
    });
    const client = TestBed.inject(HttpClient);
    const http = TestBed.inject(HttpTestingController);

    client.get('/api/session').subscribe();
    http.expectOne('/church-api/session').flush({});
    client.get('/runtime-config.json').subscribe();
    http.expectOne('/runtime-config.json').flush({});
    http.verify();
  });
});
