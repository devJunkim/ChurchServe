import { ErrorHandler, Injectable } from '@angular/core';
import { BrowserTelemetry } from '../telemetry/browser-telemetry';

@Injectable()
export class GlobalErrorHandler implements ErrorHandler {
  constructor(private readonly telemetry: BrowserTelemetry) {}

  handleError(error: unknown): void {
    const summary = error instanceof Error ? error.name : 'Unknown error';
    this.telemetry.record({
      name: 'application_error',
      operation: 'application',
      outcome: 'unexpected',
      durationMs: 0,
    });
    console.error('Unexpected application error.', summary);
  }
}
