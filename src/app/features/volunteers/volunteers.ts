import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EmptyState } from '../../shared/ui/empty-state/empty-state';
import { Panel } from '../../shared/ui/panel/panel';
import {
  catchError,
  distinctUntilChanged,
  map,
  merge,
  Observable,
  of,
  shareReplay,
  startWith,
  Subject,
  switchMap,
  timer,
} from 'rxjs';
import { Volunteer } from '../../shared/domain/volunteer';
import { VolunteerRepository } from './volunteer-repository';
import { toAppProblem, unexpectedProblemMessage } from '../../core/http/app-problem';

export type VolunteerSearchState =
  | { status: 'idle'; volunteers: readonly Volunteer[] }
  | { status: 'loading'; volunteers: readonly Volunteer[] }
  | { status: 'loaded'; volunteers: readonly Volunteer[] }
  | { status: 'failed'; volunteers: readonly Volunteer[]; message: string };

@Component({
  selector: 'app-volunteers',
  imports: [AsyncPipe, ReactiveFormsModule, EmptyState, Panel],
  templateUrl: './volunteers.html',
  styleUrl: './volunteers.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Volunteers {
  private readonly repository = inject(VolunteerRepository);
  private readonly retryRequested = new Subject<void>();

  protected readonly query = new FormControl('', { nonNullable: true });

  private readonly queryChanges = this.query.valueChanges.pipe(
    startWith(this.query.value),
    map(normalizeQuery),
    distinctUntilChanged(),
  );

  protected readonly results$: Observable<VolunteerSearchState> = merge(
    this.queryChanges,
    this.retryRequested.pipe(map(() => normalizeQuery(this.query.value))),
  ).pipe(
    switchMap((query) =>
      query.length < 2
        ? of<VolunteerSearchState>({ status: 'idle', volunteers: [] })
        : timer(250).pipe(
            switchMap(() =>
              this.repository.search(query).pipe(
                map((volunteers): VolunteerSearchState => ({ status: 'loaded', volunteers })),
                startWith<VolunteerSearchState>({ status: 'loading', volunteers: [] }),
                catchError((error: unknown) =>
                  of<VolunteerSearchState>({
                    status: 'failed',
                    volunteers: [],
                    message: volunteerSearchMessage(error),
                  }),
                ),
              ),
            ),
          ),
    ),
    shareReplay({ bufferSize: 1, refCount: true }),
  );

  protected retrySearch(): void {
    this.retryRequested.next();
  }
}

function volunteerSearchMessage(error: unknown): string {
  const problem = toAppProblem(error);
  switch (problem.kind) {
    case 'unauthenticated':
      return 'Your session expired. Sign in again to search volunteers.';
    case 'forbidden':
      return 'Your account does not have permission to search volunteers.';
    case 'unavailable':
      return 'Volunteer search is temporarily unavailable. Try again.';
    default:
      return unexpectedProblemMessage(problem, 'Volunteer search is unavailable. Try again.');
  }
}

function normalizeQuery(value: string): string {
  return value.trim().replace(/\s+/g, ' ');
}
