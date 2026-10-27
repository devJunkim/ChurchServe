import { HttpClient, HttpContext, HttpContextToken } from '@angular/common/http';
import { Injectable } from '@angular/core';

export type BrowserTelemetryEventName = 'http_request' | 'application_error';
export type BrowserTelemetryOperation =
  | 'application'
  | 'session.restore'
  | 'session.sign-in'
  | 'session.sign-out'
  | 'schedule.list'
  | 'schedule.detail'
  | 'schedule.create'
  | 'assignment.board'
  | 'assignment.create'
  | 'volunteer.search'
  | 'other';
export type BrowserTelemetryOutcome =
  | 'success'
  | 'cancelled'
  | 'validation'
  | 'unauthenticated'
  | 'forbidden'
  | 'not_found'
  | 'conflict'
  | 'unavailable'
  | 'unexpected';

export interface BrowserTelemetryEvent {
  readonly name: BrowserTelemetryEventName;
  readonly operation: BrowserTelemetryOperation;
  readonly outcome: BrowserTelemetryOutcome;
  readonly durationMs: number;
  readonly correlationId?: string;
}

export const SKIP_BROWSER_TELEMETRY = new HttpContextToken<boolean>(() => false);

@Injectable({ providedIn: 'root' })
export class BrowserTelemetry {
  private readonly endpointContext = new HttpContext().set(SKIP_BROWSER_TELEMETRY, true);

  constructor(private readonly http: HttpClient) {}

  record(event: BrowserTelemetryEvent): void {
    this.http
      .post('/api/telemetry', event, { context: this.endpointContext })
      .subscribe({ error: () => undefined });
  }
}
