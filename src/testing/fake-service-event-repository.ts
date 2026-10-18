import { Observable, of, throwError } from 'rxjs';
import { CreateServiceEventCommand } from '../app/features/schedule/create-service-event-command';
import { Page } from '../app/features/schedule/page';
import { ScheduleQuery } from '../app/features/schedule/schedule-query';
import { ServiceEventRepository } from '../app/features/schedule/service-event-repository';
import { ServiceEvent } from '../app/features/schedule/service-event';
import { buildServiceEvent } from './service-event.builder';

export class FakeServiceEventRepository extends ServiceEventRepository {
  readonly listQueries: ScheduleQuery[] = [];
  readonly findByIdCalls: string[] = [];
  readonly createCalls: CreateServiceEventCommand[] = [];

  private events: readonly ServiceEvent[];
  private findByIdFailure: unknown | undefined;

  constructor(events: readonly ServiceEvent[] = [buildServiceEvent()]) {
    super();
    this.events = events;
  }

  list(query: ScheduleQuery): Observable<Page<ServiceEvent>> {
    this.listQueries.push(query);
    const start = (query.page - 1) * query.pageSize;

    return of({
      items: this.events.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      totalItems: this.events.length,
    });
  }

  findById(id: string): Observable<ServiceEvent | undefined> {
    this.findByIdCalls.push(id);
    if (this.findByIdFailure !== undefined) {
      return throwError(() => this.findByIdFailure);
    }

    return of(this.events.find((event) => event.id === id));
  }

  create(command: CreateServiceEventCommand): Observable<ServiceEvent> {
    this.createCalls.push(command);
    const event = buildServiceEvent({
      ...command,
      id: `created-${this.events.length + 1}`,
      requiredPositions: 0,
      assignedPositions: 0,
    });
    this.events = [...this.events, event];
    return of(event);
  }

  failFindByIdWith(error: unknown): void {
    this.findByIdFailure = error;
  }
}
