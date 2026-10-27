import { HttpClient, HttpHeaders, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserTelemetry, BrowserTelemetryEvent } from './browser-telemetry';
import { httpTelemetryInterceptor } from './http-telemetry.interceptor';

describe('httpTelemetryInterceptor', () => {
  let client: HttpClient;
  let http: HttpTestingController;
  let events: BrowserTelemetryEvent[];

  beforeEach(() => {
    events = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([httpTelemetryInterceptor])),
        provideHttpClientTesting(),
        {
          provide: BrowserTelemetry,
          useValue: { record: (event: BrowserTelemetryEvent) => events.push(event) },
        },
      ],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('adds a correlation ID and records a successful bounded operation', () => {
    client.get('/api/service-events?month=2026-11&ministry=Worship').subscribe();
    const request = http.expectOne('/api/service-events?month=2026-11&ministry=Worship');
    const requestId = request.request.headers.get('X-Correlation-ID');
    expect(requestId).toBeTruthy();

    request.flush([], {
      headers: new HttpHeaders({ 'X-Correlation-ID': 'server-correlation-123' }),
    });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      name: 'http_request',
      operation: 'schedule.list',
      outcome: 'success',
      correlationId: 'server-correlation-123',
    });
    expect(JSON.stringify(events[0])).not.toContain('Worship');
  });

  it('maps an API failure without retaining volunteer search text', () => {
    client.get('/api/volunteers?search=Jane%20Doe').subscribe({ error: () => undefined });
    const request = http.expectOne('/api/volunteers?search=Jane%20Doe');
    request.flush(null, { status: 503, statusText: 'Unavailable' });

    expect(events[0]).toMatchObject({
      operation: 'volunteer.search',
      outcome: 'unavailable',
    });
    expect(JSON.stringify(events[0])).not.toContain('Jane');
  });

  it('records cancellation when a request is unsubscribed', () => {
    const subscription = client.get('/api/assignments').subscribe();
    http.expectOne('/api/assignments');
    subscription.unsubscribe();

    expect(events[0]).toMatchObject({ operation: 'assignment.board', outcome: 'cancelled' });
  });

  it('does not observe non-API resources', () => {
    client.get('/runtime-config.json').subscribe();
    http.expectOne('/runtime-config.json').flush({});
    expect(events).toEqual([]);
  });
});
