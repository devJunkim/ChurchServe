import { computed, signal } from '@angular/core';
import { Volunteer } from '../volunteers/volunteer';
import { Assignment, MinistryPosition } from './assignment';

export interface AssignmentState {
  readonly positions: readonly MinistryPosition[];
  readonly volunteers: readonly Volunteer[];
  readonly assignments: readonly Assignment[];
}

export type AssignmentValidation = { valid: true } | { valid: false; message: string };

const emptyState: AssignmentState = {
  positions: [],
  volunteers: [],
  assignments: [],
};

export class AssignmentStore {
  private readonly positionsState = signal<readonly MinistryPosition[]>([]);
  private readonly volunteersState = signal<readonly Volunteer[]>([]);
  private readonly assignmentsState = signal<readonly Assignment[]>([]);

  readonly positions = this.positionsState.asReadonly();
  readonly volunteers = this.volunteersState.asReadonly();
  readonly assignments = this.assignmentsState.asReadonly();

  readonly openPositions = computed(() => {
    const assignedIds = new Set(
      this.assignmentsState()
        .filter((assignment) => assignment.status !== 'declined')
        .map((assignment) => assignment.positionId),
    );

    return this.positionsState().filter((position) => !assignedIds.has(position.id));
  });

  constructor(initialState: AssignmentState = emptyState) {
    this.positionsState.set([...initialState.positions]);
    this.volunteersState.set([...initialState.volunteers]);
    this.assignmentsState.set([...initialState.assignments]);
  }

  assign(positionId: string, volunteerId: string): void {
    const result = validateAssignment(
      positionId,
      volunteerId,
      this.positionsState(),
      this.volunteersState(),
      this.assignmentsState(),
    );

    if (!result.valid) {
      throw new Error(result.message);
    }

    this.assignmentsState.update((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        positionId,
        volunteerId,
        status: 'proposed',
      },
    ]);
  }

  decline(assignmentId: string): void {
    if (!this.assignmentsState().some((assignment) => assignment.id === assignmentId)) {
      throw new Error('Assignment was not found.');
    }

    this.assignmentsState.update((current) =>
      current.map((assignment) =>
        assignment.id === assignmentId
          ? { ...assignment, status: 'declined' as const }
          : assignment,
      ),
    );
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
