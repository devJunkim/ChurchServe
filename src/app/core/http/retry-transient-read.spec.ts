import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { defer, firstValueFrom, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { retryTransientRead } from './retry-transient-read';

describe('retryTransientRead', () => {
  afterEach(() => vi.useRealTimers());

  it('retries a transient read with bounded exponential backoff', async () => {
    vi.useFakeTimers();
    let attempts = 0;
    const result = firstValueFrom(
      defer(() => {
        attempts++;
        return attempts < 3
          ? throwError(() => new HttpErrorResponse({ status: 503 }))
          : of('loaded');
      }).pipe(retryTransientRead({ count: 2, initialDelayMs: 10, maximumDelayMs: 20 })),
    );

    await vi.runAllTimersAsync();

    await expect(result).resolves.toBe('loaded');
    expect(attempts).toBe(3);
  });

  it('does not retry a non-transient failure', async () => {
    let attempts = 0;
    const error = new HttpErrorResponse({ status: 400 });
    const result = firstValueFrom(
      defer(() => {
        attempts++;
        return throwError(() => error);
      }).pipe(retryTransientRead()),
    );

    await expect(result).rejects.toBe(error);
    expect(attempts).toBe(1);
  });

  it('does not retry sooner than a Retry-After value outside the delay budget', async () => {
    const error = new HttpErrorResponse({
      status: 503,
      headers: new HttpHeaders({ 'Retry-After': '60' }),
    });
    let attempts = 0;
    const result = firstValueFrom(
      defer(() => {
        attempts++;
        return throwError(() => error);
      }).pipe(retryTransientRead({ maximumDelayMs: 2_000 })),
    );

    await expect(result).rejects.toBe(error);
    expect(attempts).toBe(1);
  });
});
