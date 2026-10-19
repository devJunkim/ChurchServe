import { InjectionToken } from '@angular/core';

export type CacheClock = () => number;

export const CACHE_CLOCK = new InjectionToken<CacheClock>('CACHE_CLOCK', {
  providedIn: 'root',
  factory: () => Date.now,
});
