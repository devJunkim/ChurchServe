import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ServiceEventCard } from './service-event-card/service-event-card';
import { ServiceEventRepository } from './service-event-repository';
import { ServiceEvent } from './service-event';

export type ScheduleState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; events: readonly ServiceEvent[] };

@Component({
  selector: 'app-schedule',
  imports: [RouterLink, ServiceEventCard],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Schedule {
  private readonly repository = inject(ServiceEventRepository);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly state = signal<ScheduleState>({ status: 'loading' });

  protected readonly errorMessage = computed(() => {
    const current = this.state();
    return current.status === 'error' ? current.message : '';
  });

  protected readonly events = computed(() => {
    const current = this.state();
    return current.status === 'ready' ? current.events : [];
  });

  constructor() {
    this.reload();
  }

  protected reload(): void {
    this.replaceState({ status: 'loading' });
    this.repository
      .list()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (events) => this.replaceState({ status: 'ready', events }),
        error: () =>
          this.replaceState({
            status: 'error',
            message: 'The schedule could not be loaded. Check your connection and try again.',
          }),
      });
  }

  setStateForTest(state: ScheduleState): void {
    this.replaceState(state);
  }

  private replaceState(state: ScheduleState): void {
    this.state.set(state);
  }
}
