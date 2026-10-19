import { computed, inject, Injectable, signal } from '@angular/core';
import { Volunteer } from '../../shared/domain/volunteer';
import { Assignment, AssignmentBoard, MinistryPosition } from './assignment';
import { AssignmentConflictError, AssignmentRepository } from './assignment-repository';

export type AssignmentValidation = { valid: true } | { valid: false; message: string };

@Injectable()
export class AssignmentStore {
  private readonly repository = inject(AssignmentRepository);
  private readonly eventIdState = signal<string | null>(null);
  private readonly eventVersionState = signal<number | null>(null);
  private readonly assignedPositionsState = signal<number | null>(null);
  private readonly positionsState = signal<readonly MinistryPosition[]>([]);
  private readonly volunteersState = signal<readonly Volunteer[]>([]);
  private readonly assignmentsState = signal<readonly Assignment[]>([]);
  private readonly loadingState = signal(false);
  private readonly loadErrorState = signal<string | null>(null);
  private readonly noticeState = signal<string | null>(null);

  readonly eventVersion = this.eventVersionState.asReadonly();
  readonly assignedPositions = computed(() => {
    const confirmed = this.assignedPositionsState();
    if (confirmed === null) {
      return null;
    }

    return confirmed + this.assignmentsState().filter((item) => item.syncStatus === 'pending').length;
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

  load(eventId: string): void {
    this.loadingState.set(true);
    this.loadErrorState.set(null);
    this.noticeState.set(null);

    this.repository.loadBoard(eventId).subscribe({
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
          this.assignmentsState.update((current) =>
            current.map((assignment) =>
              assignment.clientRequestId === clientRequestId ? result.assignment : assignment,
            ),
          );
          this.eventVersionState.set(result.eventVersion);
          this.assignedPositionsState.set(result.assignedPositions);
          this.noticeState.set(`${volunteer.displayName} was assigned.`);
        },
        error: (error: unknown) => {
          if (error instanceof AssignmentConflictError) {
            this.applyBoard(error.board);
            this.noticeState.set(`${error.message} The latest assignments are shown.`);
            return;
          }

          this.assignmentsState.update((current) =>
            current.filter((assignment) => assignment.clientRequestId !== clientRequestId),
          );
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
  }
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
