import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { ServiceEventCard } from './service-event-card/service-event-card';
import { ServiceEvent } from './service-event';

@Component({
  selector: 'app-schedule',
  imports: [ServiceEventCard],
  templateUrl: './schedule.html',
  styleUrl: './schedule.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Schedule {
  protected readonly events = signal<readonly ServiceEvent[]>([
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
  ]);

  private readonly selectedEventId = signal<string | null>(null);

  protected readonly selectedEvent = computed(() =>
    this.events().find((event) => event.id === this.selectedEventId()),
  );

  protected selectEvent(id: string): void {
    this.selectedEventId.set(id);
  }
}
