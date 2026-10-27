import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
  HttpResponse,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, finalize, tap } from 'rxjs';
import {
  BrowserTelemetry,
  BrowserTelemetryOperation,
  BrowserTelemetryOutcome,
  SKIP_BROWSER_TELEMETRY,
} from './browser-telemetry';

const CORRELATION_HEADER = 'X-Correlation-ID';

export const httpTelemetryInterceptor: HttpInterceptorFn = (request, next) => {
  if (request.context.get(SKIP_BROWSER_TELEMETRY) || !isApiRequest(request.url)) {
    return next(request);
  }

  return observeRequest(request, next, inject(BrowserTelemetry));
};

function observeRequest(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  telemetry: BrowserTelemetry,
): Observable<HttpEvent<unknown>> {
  const correlationId = createCorrelationId();
  const startedAt = performance.now();
  const operation = classifyOperation(request);
  let recorded = false;

  const record = (outcome: BrowserTelemetryOutcome, responseCorrelationId?: string): void => {
    if (recorded) {
      return;
    }
    recorded = true;
    telemetry.record({
      name: 'http_request',
      operation,
      outcome,
      durationMs: Math.max(0, performance.now() - startedAt),
      correlationId: responseCorrelationId ?? correlationId,
    });
  };

  return next(request.clone({ setHeaders: { [CORRELATION_HEADER]: correlationId } })).pipe(
    tap({
      next: (event) => {
        if (event instanceof HttpResponse) {
          record('success', event.headers.get(CORRELATION_HEADER) ?? undefined);
        }
      },
      error: (error: unknown) => {
        if (error instanceof HttpErrorResponse) {
          record(classifyOutcome(error.status), error.headers.get(CORRELATION_HEADER) ?? undefined);
        } else {
          record('unexpected');
        }
      },
    }),
    finalize(() => record('cancelled')),
  );
}

function classifyOperation(request: HttpRequest<unknown>): BrowserTelemetryOperation {
  const path = request.url.split(/[?#]/, 1)[0];
  if (path === '/api/session') {
    return request.method === 'DELETE' ? 'session.sign-out' : 'session.restore';
  }
  if (path === '/api/session/sign-in') {
    return 'session.sign-in';
  }
  if (path === '/api/service-events') {
    return request.method === 'POST' ? 'schedule.create' : 'schedule.list';
  }
  if (path.startsWith('/api/service-events/')) {
    return 'schedule.detail';
  }
  if (path === '/api/assignments') {
    return request.method === 'POST' ? 'assignment.create' : 'assignment.board';
  }
  if (path.startsWith('/api/assignments/')) {
    return request.method === 'POST' ? 'assignment.create' : 'assignment.board';
  }
  if (path === '/api/volunteers' || path.startsWith('/api/volunteers/')) {
    return 'volunteer.search';
  }
  return 'other';
}

function classifyOutcome(status: number): BrowserTelemetryOutcome {
  switch (status) {
    case 400:
    case 422:
      return 'validation';
    case 401:
      return 'unauthenticated';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 0:
    case 429:
    case 502:
    case 503:
    case 504:
      return 'unavailable';
    default:
      return 'unexpected';
  }
}

function createCorrelationId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `web-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  );
}

function isApiRequest(url: string): boolean {
  return url === '/api' || url.startsWith('/api/');
}
