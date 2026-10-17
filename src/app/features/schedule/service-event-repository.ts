import { Observable } from 'rxjs';
import { CreateServiceEventCommand } from './create-service-event-command';
import { Page } from './page';
import { ScheduleQuery } from './schedule-query';
import { ServiceEvent } from './service-event';

export abstract class ServiceEventRepository {
  abstract list(query: ScheduleQuery): Observable<Page<ServiceEvent>>;
  abstract findById(id: string): Observable<ServiceEvent | undefined>;
  abstract create(command: CreateServiceEventCommand): Observable<ServiceEvent>;
}
