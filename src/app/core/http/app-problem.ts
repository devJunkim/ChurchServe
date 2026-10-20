import { HttpErrorResponse } from '@angular/common/http';
import { MonoTypeOperatorFunction, catchError, throwError } from 'rxjs';

export type AppProblem =
  | { kind: 'validation'; fields: Readonly<Record<string, string>> }
  | { kind: 'unauthenticated' }
  | { kind: 'forbidden' }
  | { kind: 'not-found' }
  | { kind: 'conflict'; latestVersion?: number }
  | { kind: 'unavailable'; retryAfterSeconds?: number }
  | { kind: 'unexpected'; correlationId?: string };

export class AppProblemError extends Error {
  constructor(readonly problem: AppProblem) {
    super(`Application problem: ${problem.kind}`);
    this.name = 'AppProblemError';
  }
}

export function normalizeHttpProblem<T>(): MonoTypeOperatorFunction<T> {
  return (source) =>
    source.pipe(
      catchError((error: unknown) =>
        throwError(() =>
          error instanceof HttpErrorResponse || error instanceof AppProblemError
            ? asAppProblemError(error)
            : error,
        ),
      ),
    );
}

export function asAppProblemError(error: unknown): AppProblemError {
  return error instanceof AppProblemError ? error : new AppProblemError(toAppProblem(error));
}

export function toAppProblem(error: unknown): AppProblem {
  if (error instanceof AppProblemError) {
    return error.problem;
  }

  if (!(error instanceof HttpErrorResponse)) {
    return { kind: 'unexpected' };
  }

  switch (error.status) {
    case 400:
    case 422:
      return { kind: 'validation', fields: readValidationFields(error.error) };
    case 401:
      return { kind: 'unauthenticated' };
    case 403:
      return { kind: 'forbidden' };
    case 404:
      return { kind: 'not-found' };
    case 409:
      return { kind: 'conflict', latestVersion: readNumber(error.error, 'currentVersion') };
    case 0:
    case 429:
    case 502:
    case 503:
    case 504:
      return { kind: 'unavailable', retryAfterSeconds: readRetryAfter(error) };
    default:
      return { kind: 'unexpected', correlationId: readCorrelationId(error) };
  }
}

export function unexpectedProblemMessage(problem: AppProblem, fallback: string): string {
  return problem.kind === 'unexpected' && problem.correlationId
    ? `${fallback} Reference: ${problem.correlationId}.`
    : fallback;
}

function readValidationFields(value: unknown): Readonly<Record<string, string>> {
  if (!isRecord(value) || !isRecord(value['errors'])) {
    return {};
  }

  const fields: Record<string, string> = {};
  for (const [key, messages] of Object.entries(value['errors'])) {
    if (Array.isArray(messages)) {
      const message = messages.find((item): item is string => typeof item === 'string');
      if (message) {
        fields[key] = message;
      }
    }
  }
  return fields;
}

function readRetryAfter(error: HttpErrorResponse): number | undefined {
  const value = error.headers.get('Retry-After');
  if (!value || !/^\d+$/.test(value)) {
    return undefined;
  }

  const seconds = Number(value);
  return Number.isSafeInteger(seconds) ? seconds : undefined;
}

function readCorrelationId(error: HttpErrorResponse): string | undefined {
  const header = error.headers.get('X-Correlation-ID');
  if (header) {
    return header;
  }

  if (!isRecord(error.error)) {
    return undefined;
  }

  const value = error.error['traceId'] ?? error.error['correlationId'];
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function readNumber(value: unknown, property: string): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const candidate = value[property];
  return typeof candidate === 'number' && Number.isFinite(candidate) ? candidate : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
