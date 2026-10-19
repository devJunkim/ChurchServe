import { computed, DestroyRef, effect, inject, Injectable, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { SessionStore } from '../../core/auth/session-store';
import { CACHE_CLOCK } from '../../core/data/cache-clock';
import { RequestCache } from '../../core/data/request-cache';
import { Volunteer } from '../../shared/domain/volunteer';
import { Assignment, AssignmentBoard, MinistryPosition } from './assignment';
import { AssignmentConflictError, AssignmentRepository } from './assignment-repository';
import { ScheduleStore } from './schedule-store';

export type AssignmentValidation = { valid: true } | { valid: false; message: string };

@Injectable()
export class AssignmentStore {
  private readonly repository = inject(AssignmentRepository);
  private readonly scheduleStore = inject(ScheduleStore, { optional: true });
  private readonly sessionStore = inject(SessionStore, { optional: true });
  private readonly destroyRef = inject(DestroyRef);
  private readonly clock = inject(CACHE_CLOCK);
  private readonly eventIdState = signal<string | null>(null);
  private readonly eventVersionState = signal<number | null>(null);
  private readonly assignedPositionsState = signal<number | null>(null);
  private readonly positionsState = signal<readonly MinistryPosition[]>([]);
  private readonly volunteersState = signal<readonly Volunteer[]>([]);
  private readonly assignmentsState = signal<readonly Assignment[]>([]);
  private readonly loadingState = signal(false);
  private readonly loadErrorState = signal<string | null>(null);
  private readonly noticeState = signal<string | null>(null);
  private readonly boardCache = new RequestCache<string, AssignmentBoard>({
    maxAgeMs: 15_000,
    maxEntries: 10,
    now: this.clock,
  });
  private loadSubscription?: Subscription;
  private requestedEventId: string | null = null;
  private cacheIdentity?: string;
  private identityGeneration = 0;

  readonly eventVersion = this.eventVersionState.asReadonly();
  readonly assignedPositions = computed(() => {
    const confirmed = this.assignedPositionsState();
    if (confirmed === null) {
      return null;
    }

    return (
      confirmed + this.assignmentsState().filter((item) => item.syncStatus === 'pending').length
    );
  });
  readonly positions = this.positionsState.asReadonly();
  readonly volunteers = this.volunteersState.asReadonly();
  readonly assignments = this.assignmentsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly loadError = this.loadErrorState.asReadonly();
  readonly notice = this.noticeState.asReadonly();

  readonly openPositions = computed(() => {
    const assignedIds = new Set(
      this.assignmentsState()
        .filter((assignment) => assignment.status !== 'declined')
        .map((assignment) => assignment.positionId),
    );

    return this.positionsState().filter((position) => !assignedIds.has(position.id));
  });

  constructor() {
    this.destroyRef.onDestroy(() => this.loadSubscription?.unsubscribe());
    this.cacheIdentity = this.currentCacheIdentity();
    effect(() => {
      const identity = this.currentCacheIdentity();
      if (identity !== this.cacheIdentity) {
        this.cacheIdentity = identity;
        this.clear();
      }
    });
  }

  load(eventId: string, force = false): void {
    if (!force && this.loadingState() && this.requestedEventId === eventId) {
      return;
    }

    this.loadSubscription?.unsubscribe();
    this.requestedEventId = eventId;
    this.loadingState.set(true);
    this.loadErrorState.set(null);
    this.noticeState.set(null);

    this.loadSubscription = this.boardCache
      .getOrLoad(eventId, () => this.repository.loadBoard(eventId), force)
      .subscribe({
        next: (board) => {
          this.applyBoard(board);
          this.loadingState.set(false);
        },
        error: () => {
          this.loadingState.set(false);
          this.loadErrorState.set('Assignments could not be loaded. Try again.');
        },
      });
  }

  assign(positionId: string, volunteerId: string): void {
    const eventId = this.eventIdState();
    const eventVersion = this.eventVersionState();
    if (!eventId || eventVersion === null) {
      throw new Error('The assignment board is not loaded.');
    }

    const validation = validateAssignment(
      positionId,
      volunteerId,
      this.positionsState(),
      this.volunteersState(),
      this.assignmentsState(),
    );
    if (!validation.valid) {
      throw new Error(validation.message);
    }

    const volunteer = this.volunteersState().find((item) => item.id === volunteerId)!;
    const clientRequestId = crypto.randomUUID();
    const requestGeneration = this.identityGeneration;
    const pending: Assignment = {
      id: `pending-${clientRequestId}`,
      positionId,
      volunteerId,
      volunteerDisplayName: volunteer.displayName,
      status: 'accepted',
      syncStatus: 'pending',
      clientRequestId,
    };

    this.noticeState.set(null);
    this.assignmentsState.update((current) => [...current, pending]);
    this.boardCache.invalidate(eventId);

    this.repository
      .assign({
        eventId,
        positionId,
        volunteerId,
        expectedEventVersion: eventVersion,
        clientRequestId,
      })
      .subscribe({
        next: (result) => {
          if (requestGeneration !== this.identityGeneration) {
            return;
          }

          this.assignmentsState.update((current) =>
            current.map((assignment) =>
              assignment.clientRequestId === clientRequestId ? result.assignment : assignment,
            ),
          );
          this.eventVersionState.set(result.eventVersion);
          this.assignedPositionsState.set(result.assignedPositions);
          this.cacheCurrentBoard();
          this.scheduleStore?.synchronizeAssignmentSummary(
            eventId,
            result.assignedPositions,
            result.eventVersion,
          );
          this.noticeState.set(`${volunteer.displayName} was assigned.`);
        },
        error: (error: unknown) => {
          if (requestGeneration !== this.identityGeneration) {
            return;
          }

          if (error instanceof AssignmentConflictError) {
            this.applyBoard(error.board);
            this.scheduleStore?.synchronizeAssignmentSummary(
              eventId,
              error.board.assignedPositions,
              error.board.eventVersion,
            );
            this.noticeState.set(`${error.message} The latest assignments are shown.`);
            return;
          }

          this.assignmentsState.update((current) =>
            current.filter((assignment) => assignment.clientRequestId !== clientRequestId),
          );
          this.boardCache.invalidate(eventId);
          this.noticeState.set('The assignment was not saved. Try again.');
        },
      });
  }

  assignmentFor(positionId: string): Assignment | undefined {
    return this.assignmentsState().find(
      (assignment) => assignment.positionId === positionId && assignment.status !== 'declined',
    );
  }

  volunteersFor(position: MinistryPosition): readonly Volunteer[] {
    return this.volunteersState().filter((volunteer) =>
      volunteer.eligibleMinistries.includes(position.ministry),
    );
  }

  private applyBoard(board: AssignmentBoard): void {
    this.eventIdState.set(board.eventId);
    this.eventVersionState.set(board.eventVersion);
    this.assignedPositionsState.set(board.assignedPositions);
    this.positionsState.set(board.positions);
    this.volunteersState.set(board.volunteers);
    this.assignmentsState.set(board.assignments);
    this.boardCache.set(board.eventId, board);
  }

  private cacheCurrentBoard(): void {
    const eventId = this.eventIdState();
    const eventVersion = this.eventVersionState();
    const assignedPositions = this.assignedPositionsState();
    if (!eventId || eventVersion === null || assignedPositions === null) {
      return;
    }

    if (this.assignmentsState().some((item) => item.syncStatus === 'pending')) {
      return;
    }

    this.boardCache.set(eventId, {
      eventId,
      eventVersion,
      assignedPositions,
      positions: this.positionsState(),
      volunteers: this.volunteersState(),
      assignments: this.assignmentsState().filter((item) => item.syncStatus === 'confirmed'),
    });
  }

  private clear(): void {
    this.identityGeneration++;
    this.loadSubscription?.unsubscribe();
    this.loadSubscription = undefined;
    this.requestedEventId = null;
    this.boardCache.clear();
    this.eventIdState.set(null);
    this.eventVersionState.set(null);
    this.assignedPositionsState.set(null);
    this.positionsState.set([]);
    this.volunteersState.set([]);
    this.assignmentsState.set([]);
    this.loadingState.set(false);
    this.loadErrorState.set(null);
    this.noticeState.set(null);
  }

  private currentCacheIdentity(): string {
    return this.sessionStore
      ? sessionCacheIdentity(this.sessionStore.session())
      : 'session-not-provided';
  }
}

function sessionCacheIdentity(session: ReturnType<SessionStore['session']>): string {
  if (session.status !== 'authenticated') {
    return session.status;
  }

  return `${session.user.id}|${[...session.user.roles].sort().join(',')}`;
}

export function validateAssignment(
  positionId: string,
  volunteerId: string,
  positions: readonly MinistryPosition[],
  volunteers: readonly Volunteer[],
  assignments: readonly Assignment[],
): AssignmentValidation {
  const position = positions.find((item) => item.id === positionId);
  if (!position) {
    return { valid: false, message: 'Position was not found.' };
  }

  const volunteer = volunteers.find((item) => item.id === volunteerId);
  if (!volunteer) {
    return { valid: false, message: 'Volunteer was not found.' };
  }

  if (!volunteer.eligibleMinistries.includes(position.ministry)) {
    return { valid: false, message: 'Volunteer is not eligible for this ministry.' };
  }

  const occupied = assignments.some(
    (item) => item.positionId === positionId && item.status !== 'declined',
  );

  return occupied
    ? { valid: false, message: 'Position already has an assignment.' }
    : { valid: true };
}
