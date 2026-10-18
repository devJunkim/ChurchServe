import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subscription, of, tap } from 'rxjs';
import { CreateServiceEventCommand } from './create-service-event-command';
import { Page } from './page';
import { equalScheduleQuery, ScheduleQuery } from './schedule-query';
import { ServiceEventRepository } from './service-event-repository';
import { ServiceEvent } from './service-event';

export type ScheduleLoadState = 'idle' | 'loading' | 'loaded' | 'failed';

@Injectable()
export class ScheduleStore {
  private readonly repository = inject(ServiceEventRepository);
  private readonly destroyRef = inject(DestroyRef);
  private readonly loadStateValue = signal<ScheduleLoadState>('idle');
  private readonly queryValue = signal<ScheduleQuery | null>(null);
  private readonly pageValue = signal<Page<ServiceEvent> | null>(null);
  private readonly loadErrorValue = signal('');
  private readonly eventCacheValue = signal<ReadonlyMap<string, ServiceEvent>>(new Map());
  private loadSubscription?: Subscription;

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
  }

  load(query: ScheduleQuery, force = false): void {
    const currentQuery = this.queryValue();
    const isSameQuery = currentQuery !== null && equalScheduleQuery(currentQuery, query);

    if (
      !force &&
      isSameQuery &&
      (this.loadStateValue() === 'loading' || this.loadStateValue() === 'loaded')
    ) {
      return;
    }

    this.loadSubscription?.unsubscribe();
    this.queryValue.set(query);
    this.loadStateValue.set('loading');
    this.loadErrorValue.set('');

    this.loadSubscription = this.repository.list(query).subscribe({
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
    const cachedEvent = this.eventCacheValue().get(id);
    if (cachedEvent) {
      return of(cachedEvent);
    }

    return this.repository.findById(id).pipe(
      tap((event) => {
        if (event) {
          this.cacheEvents([event]);
        }
      }),
    );
  }

  create(command: CreateServiceEventCommand): Observable<ServiceEvent> {
    return this.repository.create(command).pipe(tap((event) => this.cacheEvents([event])));
  }

  private cacheEvents(events: readonly ServiceEvent[]): void {
    if (events.length === 0) {
      return;
    }

    const nextCache = new Map(this.eventCacheValue());
    for (const event of events) {
      nextCache.set(event.id, event);
    }
    this.eventCacheValue.set(nextCache);
  }
}
