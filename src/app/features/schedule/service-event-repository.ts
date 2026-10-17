import { Observable } from 'rxjs';
import { CreateServiceEventCommand } from './create-service-event-command';
import { ServiceEvent } from './service-event';

export abstract class ServiceEventRepository {
  abstract list(): Observable<readonly ServiceEvent[]>;
  abstract findById(id: string): Observable<ServiceEvent | undefined>;
  abstract create(command: CreateServiceEventCommand): Observable<ServiceEvent>;
}
