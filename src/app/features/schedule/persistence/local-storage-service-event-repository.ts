import { Injectable, signal, WritableSignal } from '@angular/core';
import { CreateServiceEventCommand } from '../create-service-event-command';
import { ServiceEventRepository } from '../service-event-repository';
import { ServiceEvent } from '../service-event';
import { KeyValueStorage } from './key-value-storage';
import { ChurchServeLocalDataV1, churchServeStorageKey, readLocalData } from './local-data';

@Injectable()
export class LocalStorageServiceEventRepository extends ServiceEventRepository {
  private readonly document: ChurchServeLocalDataV1;
  private readonly eventsState: WritableSignal<readonly ServiceEvent[]>;

  constructor(private readonly storage: KeyValueStorage) {
    super();
    this.document = readLocalData(storage);
    this.eventsState = signal<readonly ServiceEvent[]>(this.document.events);
  }

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
    const events = [...this.eventsState(), event];

    this.persist({ ...this.document, events });
    this.eventsState.set(events);
    return event;
  }

  private persist(document: ChurchServeLocalDataV1): void {
    this.storage.set(churchServeStorageKey, JSON.stringify(document));
  }
}
