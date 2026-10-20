import { vi } from 'vitest';
import { GlobalErrorHandler } from './global-error-handler';

describe('GlobalErrorHandler', () => {
  it('reports only a safe error category', () => {
    const report = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    new GlobalErrorHandler().handleError(new Error('volunteer name and request body'));

    expect(report).toHaveBeenCalledWith('Unexpected application error.', 'Error');
    expect(JSON.stringify(report.mock.calls)).not.toContain('volunteer name');
    report.mockRestore();
  });
});
