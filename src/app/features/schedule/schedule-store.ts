import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { Observable, Subscription, tap } from 'rxjs';
import { CACHE_CLOCK } from '../../core/data/cache-clock';
import { RequestCache } from '../../core/data/request-cache';
import { SessionStore } from '../../core/auth/session-store';
import { CreateServiceEventCommand } from './create-service-event-command';
import { Page } from './page';
import { equalScheduleQuery, scheduleQueryCacheKey, ScheduleQuery } from './schedule-query';
import { ServiceEventRepository } from './service-event-repository';
import { ServiceEvent } from './service-event';

export type ScheduleLoadState = 'idle' | 'loading' | 'loaded' | 'failed';

@Injectable()
export class ScheduleStore {
  private readonly repository = inject(ServiceEventRepository);
  private readonly sessionStore = inject(SessionStore, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly clock = inject(CACHE_CLOCK);
  private readonly loadStateValue = signal<ScheduleLoadState>('idle');
  private readonly queryValue = signal<ScheduleQuery | null>(null);
  private readonly pageValue = signal<Page<ServiceEvent> | null>(null);
  private readonly loadErrorValue = signal('');
  private readonly pageCache = new RequestCache<string, Page<ServiceEvent>>({
    maxAgeMs: 30_000,
    maxEntries: 6,
    now: this.clock,
  });
  private readonly eventCache = new RequestCache<string, ServiceEvent | undefined>({
    maxAgeMs: 60_000,
    maxEntries: 20,
    now: this.clock,
  });
  private loadSubscription?: Subscription;
  private cacheIdentity?: string;
  private identityGeneration = 0;

  readonly loadState = this.loadStateValue.asReadonly();
  readonly query = this.queryValue.asReadonly();
  readonly page = this.pageValue.asReadonly();
  readonly loadError = this.loadErrorValue.asReadonly();
  readonly events = computed(() => this.pageValue()?.items ?? []);
  readonly totalOpenPositions = computed(() =>
    this.events().reduce(
      (total, event) => total + Math.max(0, event.requiredPositions - event.assignedPositions),
      0,
    ),
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.loadSubscription?.unsubscribe());
    this.cacheIdentity = this.currentCacheIdentity();
    effect(() => {
      const identity = this.currentCacheIdentity();
      if (identity !== this.cacheIdentity) {
        this.cacheIdentity = identity;
        this.clear();
      }
    });
  }

  load(query: ScheduleQuery, force = false): void {
    const currentQuery = this.queryValue();
    const isSameQuery = currentQuery !== null && equalScheduleQuery(currentQuery, query);

    if (!force && isSameQuery && this.loadStateValue() === 'loading') {
      return;
    }

    this.loadSubscription?.unsubscribe();
    this.queryValue.set(query);
    this.loadStateValue.set('loading');
    this.loadErrorValue.set('');

    const cacheKey = scheduleQueryCacheKey(query);
    this.loadSubscription = this.pageCache
      .getOrLoad(cacheKey, () => this.repository.list(query), force)
      .subscribe({
        next: (page) => {
          this.pageValue.set(page);
          this.cacheEvents(page.items);
          this.loadStateValue.set('loaded');
        },
        error: () => {
          this.loadStateValue.set('failed');
          this.loadErrorValue.set(
            'The schedule could not be loaded. Check your connection and try again.',
          );
        },
      });
  }

  retry(): void {
    const query = this.queryValue();
    if (query) {
      this.load(query, true);
    }
  }

  findById(id: string): Observable<ServiceEvent | undefined> {
    return this.eventCache.getOrLoad(id, () => this.repository.findById(id));
  }

  create(command: CreateServiceEventCommand): Observable<ServiceEvent> {
    const requestGeneration = this.identityGeneration;
    return this.repository.create(command).pipe(
      tap((event) => {
        if (requestGeneration !== this.identityGeneration) {
          return;
        }

        this.pageCache.clear();
        this.cacheEvents([event]);
      }),
    );
  }

  synchronizeAssignmentSummary(eventId: string, assignedPositions: number, version: number): void {
    const cached = this.eventCache.read(eventId);
    if (cached.hit && cached.value) {
      this.eventCache.set(eventId, { ...cached.value, assignedPositions, version });
    }

    const page = this.pageValue();
    if (page?.items.some((event) => event.id === eventId)) {
      const nextPage = {
        ...page,
        items: page.items.map((event) =>
          event.id === eventId ? { ...event, assignedPositions, version } : event,
        ),
      };
      this.pageValue.set(nextPage);
      this.cacheEvents(nextPage.items);
    }

    this.pageCache.clear();
  }

  private cacheEvents(events: readonly ServiceEvent[]): void {
    if (events.length === 0) {
      return;
    }

    for (const event of events) {
      this.eventCache.set(event.id, event);
    }
  }

  private clear(): void {
    this.identityGeneration++;
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = undefined;
    this.loadStateValue.set('idle');
    this.queryValue.set(null);
    this.pageValue.set(null);
    this.loadErrorValue.set('');
    this.pageCache.clear();
    this.eventCache.clear();
  }

  private currentCacheIdentity(): string {
    return this.sessionStore
      ? sessionCacheIdentity(this.sessionStore.session())
      : 'session-not-provided';
  }
}

function sessionCacheIdentity(session: ReturnType<SessionStore['session']>): string {
  if (session.status !== 'authenticated') {
    return session.status;
  }

  return `${session.user.id}|${[...session.user.roles].sort().join(',')}`;
}
