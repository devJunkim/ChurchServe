import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
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
    this.replaceState({ status: 'ready', events: this.repository.list() });
  }

  setStateForTest(state: ScheduleState): void {
    this.replaceState(state);
  }

  private replaceState(state: ScheduleState): void {
    this.state.set(state);
  }
}
