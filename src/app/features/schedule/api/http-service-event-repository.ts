import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { CreateServiceEventCommand } from '../create-service-event-command';
import { ServiceEventRepository } from '../service-event-repository';
import { ServiceEvent } from '../service-event';
import { parseServiceEvent, parseServiceEventList } from './service-event-dto';

@Injectable()
export class HttpServiceEventRepository extends ServiceEventRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/service-events';

  list(): Observable<readonly ServiceEvent[]> {
    return this.http.get<unknown>(this.baseUrl).pipe(map(parseServiceEventList));
  }

  findById(id: string): Observable<ServiceEvent | undefined> {
    return this.http.get<unknown>(`${this.baseUrl}/${encodeURIComponent(id)}`).pipe(
      map(parseServiceEvent),
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 404
          ? of(undefined)
          : throwError(() => error),
      ),
    );
  }

  create(command: CreateServiceEventCommand): Observable<ServiceEvent> {
    return this.http.post<unknown>(this.baseUrl, command).pipe(map(parseServiceEvent));
  }
}
