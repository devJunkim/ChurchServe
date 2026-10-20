import { HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import {
  AppProblemError,
  asAppProblemError,
  toAppProblem,
  unexpectedProblemMessage,
} from './app-problem';

describe('app problems', () => {
  it('maps validation problem details without exposing unrelated response data', () => {
    const problem = toAppProblem(
      new HttpErrorResponse({
        status: 400,
        error: {
          title: 'Internal validation details',
          errors: { title: ['A service name is required.'], ignored: [42] },
        },
      }),
    );

    expect(problem).toEqual({
      kind: 'validation',
      fields: { title: 'A service name is required.' },
    });
  });

  it.each([
    [401, 'unauthenticated'],
    [403, 'forbidden'],
    [404, 'not-found'],
  ])('maps HTTP %s to %s', (status, kind) => {
    expect(toAppProblem(new HttpErrorResponse({ status }))).toMatchObject({ kind });
  });

  it('keeps safe conflict and retry metadata', () => {
    expect(
      toAppProblem(new HttpErrorResponse({ status: 409, error: { currentVersion: 7 } })),
    ).toEqual({ kind: 'conflict', latestVersion: 7 });

    expect(
      toAppProblem(
        new HttpErrorResponse({
          status: 503,
          headers: new HttpHeaders({ 'Retry-After': '3' }),
        }),
      ),
    ).toEqual({ kind: 'unavailable', retryAfterSeconds: 3 });
  });

  it('adds a correlation ID to an unexpected-error message', () => {
    const problem = toAppProblem(
      new HttpErrorResponse({ status: 500, error: { traceId: 'trace-123' } }),
    );

    expect(unexpectedProblemMessage(problem, 'The request failed.')).toBe(
      'The request failed. Reference: trace-123.',
    );
  });

  it('does not wrap an application problem twice', () => {
    const error = new AppProblemError({ kind: 'forbidden' });
    expect(asAppProblemError(error)).toBe(error);
  });
});
