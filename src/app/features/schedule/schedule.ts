import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  catchError,
  distinctUntilChanged,
  map,
  merge,
  of,
  startWith,
  Subject,
  switchMap,
  tap,
} from 'rxjs';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Panel } from '../../shared/ui/panel/panel';
import { Page } from './page';
import { equalScheduleQuery, parseScheduleQuery, scheduleMinistries } from './schedule-query';
import { ServiceEventCard } from './service-event-card/service-event-card';
import { ServiceEventRepository } from './service-event-repository';
import { ServiceEvent } from './service-event';

export type ScheduleState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; page: Page<ServiceEvent> };

@Component({
  selector: 'app-schedule',
  imports: [RouterLink, ServiceEventCard, EmptyState, Panel],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Schedule {
  private readonly repository = inject(ServiceEventRepository);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly retry = new Subject<void>();

  protected readonly ministries = scheduleMinistries;
  protected readonly query = signal(parseScheduleQuery(this.route.snapshot.queryParamMap));
  protected readonly state = signal<ScheduleState>({ status: 'loading' });

  protected readonly errorMessage = computed(() => {
    const current = this.state();
    return current.status === 'error' ? current.message : '';
  });

  protected readonly page = computed(() => {
    const current = this.state();
    return current.status === 'ready' ? current.page : null;
  });

  protected readonly events = computed(() => this.page()?.items ?? []);
  protected readonly totalPages = computed(() => {
    const page = this.page();
    return page ? Math.max(1, Math.ceil(page.totalItems / page.pageSize)) : 1;
  });
  protected readonly hasPreviousPage = computed(() => this.query().page > 1);
  protected readonly hasNextPage = computed(() => this.query().page < this.totalPages());

  constructor() {
    const queryChanges$ = this.route.queryParamMap.pipe(
      map((params) => parseScheduleQuery(params)),
      distinctUntilChanged(equalScheduleQuery),
      tap((query) => this.query.set(query)),
    );

    merge(queryChanges$, this.retry.pipe(map(() => this.query())))
      .pipe(
        switchMap((query) =>
          this.repository.list(query).pipe(
            map((page): ScheduleState => ({ status: 'ready', page })),
            startWith<ScheduleState>({ status: 'loading' }),
            catchError(() =>
              of<ScheduleState>({
                status: 'error',
                message: 'The schedule could not be loaded. Check your connection and try again.',
              }),
            ),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((state) => this.state.set(state));

    this.canonicalizeQueryString();
  }

  protected changeMonth(month: string): void {
    void this.navigate({ month, page: 1 });
  }

  protected changeMinistry(ministry: string): void {
    void this.navigate({ ministry: ministry || null, page: 1 });
  }

  protected showAllMinistries(): void {
    this.changeMinistry('');
  }

  protected changePage(page: number): void {
    if (page >= 1 && page <= this.totalPages()) {
      void this.navigate({ page });
    }
  }

  protected reload(): void {
    this.retry.next();
  }

  setStateForTest(state: ScheduleState): void {
    this.state.set(state);
  }

  private navigate(queryParams: Record<string, string | number | null>): Promise<boolean> {
    return this.router.navigate([], {
      relativeTo: this.route,
      queryParams,
      queryParamsHandling: 'merge',
    });
  }

  private canonicalizeQueryString(): void {
    const query = this.query();
    const params = this.route.snapshot.queryParamMap;

    if (
      params.get('month') === query.month &&
      params.get('page') === String(query.page) &&
      params.get('ministry') === query.ministry
    ) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { month: query.month, ministry: query.ministry, page: query.page },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }
}
