import { safeReturnUrl } from './safe-return-url';

describe('safeReturnUrl', () => {
  it('keeps an internal application URL', () => {
    expect(safeReturnUrl('/schedule/event-1?view=staffing')).toBe(
      '/schedule/event-1?view=staffing',
    );
  });

  it.each([null, '', 'https://example.com', '//example.com', '/\\example.com'])(
    'uses the fallback for unsafe value %s',
    (value) => {
      expect(safeReturnUrl(value)).toBe('/schedule');
    },
  );
});
