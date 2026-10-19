import { convertToParamMap } from '@angular/router';
import { parseScheduleQuery, scheduleQueryCacheKey } from './schedule-query';

describe('parseScheduleQuery', () => {
  const now = new Date(2026, 9, 17);

  it('parses supported filters and a positive page', () => {
    const query = parseScheduleQuery(
      convertToParamMap({ month: '2026-11', ministry: 'Technical', page: '3' }),
      now,
    );

    expect(query).toEqual({
      month: '2026-11',
      ministry: 'technical',
      page: 3,
      pageSize: 4,
    });
  });

  it('replaces invalid values with safe defaults', () => {
    const query = parseScheduleQuery(
      convertToParamMap({ month: 'November', ministry: 'unknown', page: '-1' }),
      now,
    );

    expect(query).toEqual({ month: '2026-10', ministry: null, page: 1, pageSize: 4 });
  });
});

describe('scheduleQueryCacheKey', () => {
  it('normalizes ministry casing and whitespace', () => {
    expect(
      scheduleQueryCacheKey({
        month: '2026-11',
        ministry: ' Technical ',
        page: 2,
        pageSize: 4,
      }),
    ).toBe('2026-11|technical|2|4');
  });

  it('keeps paging parameters in the key', () => {
    expect(
      scheduleQueryCacheKey({ month: '2026-11', ministry: null, page: 1, pageSize: 4 }),
    ).not.toBe(scheduleQueryCacheKey({ month: '2026-11', ministry: null, page: 2, pageSize: 4 }));
  });
});
