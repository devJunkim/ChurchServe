import { Injectable, signal } from '@angular/core';
import { CreateServiceEventCommand } from './create-service-event-command';
import { ServiceEventRepository } from './service-event-repository';
import { ServiceEvent } from './service-event';

const initialEvents: readonly ServiceEvent[] = [
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

@Injectable()
export class InMemoryServiceEventRepository extends ServiceEventRepository {
  private readonly eventsState = signal<readonly ServiceEvent[]>(initialEvents);

  list(): readonly ServiceEvent[] {
    return this.eventsState();
  }

  findById(id: string): ServiceEvent | undefined {
    return this.eventsState().find((event) => event.id === id);
  }

  create(command: CreateServiceEventCommand): ServiceEvent {
    const event: ServiceEvent = {
      id: crypto.randomUUID(),
      ...command,
      requiredPositions: 0,
      assignedPositions: 0,
    };

    this.eventsState.update((events) => [...events, event]);
    return event;
  }
}
