import { MonoTypeOperatorFunction, retry, throwError, timer } from 'rxjs';
import { toAppProblem } from './app-problem';

export interface RetryTransientReadOptions {
  readonly count?: number;
  readonly initialDelayMs?: number;
  readonly maximumDelayMs?: number;
}

export function retryTransientRead<T>(
  options: RetryTransientReadOptions = {},
): MonoTypeOperatorFunction<T> {
  const count = options.count ?? 2;
  const initialDelayMs = options.initialDelayMs ?? 250;
  const maximumDelayMs = options.maximumDelayMs ?? 2_000;

  return retry({
    count,
    delay: (error: unknown, retryCount) => {
      const problem = toAppProblem(error);
      if (problem.kind !== 'unavailable') {
        return throwError(() => error);
      }

      const retryAfterMs =
        problem.retryAfterSeconds === undefined ? undefined : problem.retryAfterSeconds * 1_000;
      if (retryAfterMs !== undefined && retryAfterMs > maximumDelayMs) {
        return throwError(() => error);
      }

      const backoffMs = Math.min(maximumDelayMs, initialDelayMs * 2 ** (retryCount - 1));
      return timer(Math.max(retryAfterMs ?? 0, backoffMs));
    },
  });
}
