import { ParamMap } from '@angular/router';

export const SCHEDULE_PAGE_SIZE = 4;

export const scheduleMinistries = [
  { value: 'welcome', label: 'Welcome' },
  { value: 'worship', label: 'Worship' },
  { value: 'technical', label: 'Technical' },
] as const;

export interface ScheduleQuery {
  readonly month: string;
  readonly ministry: string | null;
  readonly page: number;
  readonly pageSize: number;
}

export function parseScheduleQuery(params: ParamMap, now = new Date()): ScheduleQuery {
  const requestedMonth = params.get('month');
  const requestedMinistry = params.get('ministry')?.toLowerCase() ?? null;
  const requestedPage = Number(params.get('page'));

  return {
    month: isMonth(requestedMonth) ? requestedMonth : toMonth(now),
    ministry: scheduleMinistries.some(({ value }) => value === requestedMinistry)
      ? requestedMinistry
      : null,
    page: Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1,
    pageSize: SCHEDULE_PAGE_SIZE,
  };
}

export function equalScheduleQuery(left: ScheduleQuery, right: ScheduleQuery): boolean {
  return (
    left.month === right.month &&
    left.ministry === right.ministry &&
    left.page === right.page &&
    left.pageSize === right.pageSize
  );
}

function isMonth(value: string | null): value is string {
  return value !== null && /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

function toMonth(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}
