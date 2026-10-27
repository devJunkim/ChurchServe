import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserTelemetry, SKIP_BROWSER_TELEMETRY } from './browser-telemetry';

describe('BrowserTelemetry', () => {
  it('posts only the bounded telemetry contract and prevents recursive telemetry', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const telemetry = TestBed.inject(BrowserTelemetry);
    const http = TestBed.inject(HttpTestingController);

    telemetry.record({
      name: 'http_request',
      operation: 'schedule.list',
      outcome: 'success',
      durationMs: 42,
      correlationId: 'browser-request-123',
    });

    const request = http.expectOne('/api/telemetry');
    expect(request.request.context.get(SKIP_BROWSER_TELEMETRY)).toBe(true);
    expect(request.request.body).toEqual({
      name: 'http_request',
      operation: 'schedule.list',
      outcome: 'success',
      durationMs: 42,
      correlationId: 'browser-request-123',
    });
    request.flush(null, { status: 202, statusText: 'Accepted' });
    http.verify();
  });
});
