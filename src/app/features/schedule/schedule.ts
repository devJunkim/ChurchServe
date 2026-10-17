import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ServiceEventCard } from './service-event-card/service-event-card';
import { ServiceEvent } from './service-event';

export type ScheduleState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; events: readonly ServiceEvent[] };

const scheduledEvents: readonly ServiceEvent[] = [
  {
    id: 'sunday-2026-11-01',
    title: 'Sunday Morning Service',
    startsAt: '2026-11-01T10:00:00-05:00',
    endsAt: '2026-11-01T11:30:00-05:00',
    location: 'Main Sanctuary',
    requiredPositions: 10,
    assignedPositions: 7,
  },
  {
    id: 'rehearsal-2026-11-05',
    title: 'Worship Team Rehearsal',
    startsAt: '2026-11-05T19:00:00-05:00',
    endsAt: '2026-11-05T20:30:00-05:00',
    location: 'Music Room',
    requiredPositions: 6,
    assignedPositions: 6,
  },
];

@Component({
  selector: 'app-schedule',
  imports: [ServiceEventCard],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Schedule {
  protected readonly state = signal<ScheduleState>({ status: 'loading' });

  private readonly selectedEventId = signal<string | null>(null);

  protected readonly errorMessage = computed(() => {
    const current = this.state();
    return current.status === 'error' ? current.message : '';
  });

  protected readonly events = computed(() => {
    const current = this.state();
    return current.status === 'ready' ? current.events : [];
  });

  protected readonly selectedEvent = computed(() => {
    return this.events().find((event) => event.id === this.selectedEventId());
  });

  constructor() {
    this.reload();
  }

  protected selectEvent(id: string): void {
    this.selectedEventId.set(id);
  }

  protected reload(): void {
    this.replaceState({ status: 'ready', events: scheduledEvents });
  }

  setStateForTest(state: ScheduleState): void {
    this.replaceState(state);
  }

  private replaceState(state: ScheduleState): void {
    this.selectedEventId.set(null);
    this.state.set(state);
  }
}
