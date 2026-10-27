import { vi } from 'vitest';
import { BrowserTelemetryEvent } from '../telemetry/browser-telemetry';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  it('reports only a safe error category', () => {
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const events: BrowserTelemetryEvent[] = [];

    new GlobalErrorHandler({
      record: (event: BrowserTelemetryEvent) => events.push(event),
    } as never).handleError(new Error('volunteer name and request body'));

    expect(report).toHaveBeenCalledWith('Unexpected application error.', 'Error');
    expect(JSON.stringify(report.mock.calls)).not.toContain('volunteer name');
    expect(events).toEqual([
      {
        name: 'application_error',
        operation: 'application',
        outcome: 'unexpected',
        durationMs: 0,
      },
    ]);
    expect(JSON.stringify(events)).not.toContain('volunteer name');
    report.mockRestore();
  });
});
