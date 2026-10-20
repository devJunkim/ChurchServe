import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, map, Observable, throwError } from 'rxjs';
import {
  AppProblemError,
  asAppProblemError,
  normalizeHttpProblem,
} from '../../../core/http/app-problem';
import { retryTransientRead } from '../../../core/http/retry-transient-read';
import { AssignVolunteerCommand } from '../assignment';
import { AssignmentConflictError, AssignmentRepository } from '../assignment-repository';
import {
  parseAssignmentBoard,
  parseAssignmentConflict,
  parseAssignVolunteerResult,
} from './assignment-dto';

@Injectable()
export class HttpAssignmentRepository extends AssignmentRepository {
  private readonly http = inject(HttpClient);

  loadBoard(eventId: string) {
    return this.http
      .get<unknown>(`/api/service-events/${encodeURIComponent(eventId)}/assignment-board`)
      .pipe(retryTransientRead(), map(parseAssignmentBoard), normalizeHttpProblem());
  }

  assign(
    command: AssignVolunteerCommand,
  ): Observable<ReturnType<typeof parseAssignVolunteerResult>> {
    return this.http
      .post<unknown>(`/api/service-events/${encodeURIComponent(command.eventId)}/assignments`, {
        positionId: command.positionId,
        volunteerId: command.volunteerId,
        expectedEventVersion: command.expectedEventVersion,
        clientRequestId: command.clientRequestId,
      })
      .pipe(
        map(parseAssignVolunteerResult),
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 409) {
            const conflict = parseAssignmentConflict(error.error);
            return throwError(() => new AssignmentConflictError(conflict.message, conflict.board));
          }

          return throwError(() =>
            error instanceof HttpErrorResponse || error instanceof AppProblemError
              ? asAppProblemError(error)
              : error,
          );
        }),
      );
  }
}
