import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { distinctUntilChanged, map } from 'rxjs';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Panel } from '../../shared/ui/panel/panel';
import { equalScheduleQuery, parseScheduleQuery, scheduleMinistries } from './schedule-query';
import { ServiceEventCard } from './service-event-card/service-event-card';
import { ScheduleStore } from './schedule-store';
import { SessionStore } from '../../core/auth/session-store';
import { hasPermission, PERMISSIONS } from '../../core/auth/current-user';

@Component({
  selector: 'app-schedule',
  imports: [RouterLink, ServiceEventCard, EmptyState, Panel],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Schedule {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly sessions = inject(SessionStore);

  protected readonly store = inject(ScheduleStore);
  protected readonly ministries = scheduleMinistries;
  protected readonly canManageSchedule = computed(() => {
    const session = this.sessions.session();
    return (
      session.status === 'authenticated' && hasPermission(session.user, PERMISSIONS.scheduleManage)
    );
  });
  protected readonly query = computed(
    () => this.store.query() ?? parseScheduleQuery(this.route.snapshot.queryParamMap),
  );
  protected readonly totalPages = computed(() => {
    const page = this.store.page();
    return page ? Math.max(1, Math.ceil(page.totalItems / page.pageSize)) : 1;
  });
  protected readonly hasPreviousPage = computed(() => this.query().page > 1);
  protected readonly hasNextPage = computed(() => this.query().page < this.totalPages());

  constructor() {
    this.route.queryParamMap
      .pipe(
        map((params) => parseScheduleQuery(params)),
        distinctUntilChanged(equalScheduleQuery),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((query) => this.store.load(query));

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
    this.store.retry();
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
