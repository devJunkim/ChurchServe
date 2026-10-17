import { CreateServiceEventCommand } from './create-service-event-command';
import { ServiceEvent } from './service-event';

export abstract class ServiceEventRepository {
  abstract list(): readonly ServiceEvent[];
  abstract findById(id: string): ServiceEvent | undefined;
  abstract create(command: CreateServiceEventCommand): ServiceEvent;
}
