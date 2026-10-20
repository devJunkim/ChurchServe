import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, of, throwError } from 'rxjs';
import { normalizeHttpProblem } from '../../../core/http/app-problem';
import { retryTransientRead } from '../../../core/http/retry-transient-read';
import { CreateServiceEventCommand } from '../create-service-event-command';
import { Page } from '../page';
import { ScheduleQuery } from '../schedule-query';
import { ServiceEventRepository } from '../service-event-repository';
import { ServiceEvent } from '../service-event';
import { parseServiceEvent, parseServiceEventPage } from './service-event-dto';

@Injectable()
export class HttpServiceEventRepository extends ServiceEventRepository {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/service-events';

  list(query: ScheduleQuery): Observable<Page<ServiceEvent>> {
    let params = new HttpParams()
      .set('month', query.month)
      .set('page', query.page)
      .set('pageSize', query.pageSize);

    if (query.ministry) {
      params = params.set('ministry', query.ministry);
    }

    return this.http
      .get<unknown>(this.baseUrl, { params })
      .pipe(retryTransientRead(), map(parseServiceEventPage), normalizeHttpProblem());
  }

  findById(id: string): Observable<ServiceEvent | undefined> {
    return this.http.get<unknown>(`${this.baseUrl}/${encodeURIComponent(id)}`).pipe(
      retryTransientRead(),
      map(parseServiceEvent),
      catchError((error: unknown) =>
        error instanceof HttpErrorResponse && error.status === 404
          ? of(undefined)
          : throwError(() => error),
      ),
      normalizeHttpProblem(),
    );
  }

  create(command: CreateServiceEventCommand): Observable<ServiceEvent> {
    return this.http
      .post<unknown>(this.baseUrl, command)
      .pipe(map(parseServiceEvent), normalizeHttpProblem());
  }
}
