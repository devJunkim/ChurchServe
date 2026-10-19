import { Volunteer } from '../../../shared/domain/volunteer';
import {
  Assignment,
  AssignmentBoard,
  AssignVolunteerResult,
  MinistryPosition,
} from '../assignment';

export function parseAssignmentBoard(value: unknown): AssignmentBoard {
  if (
    !isRecord(value) ||
    !hasString(value, 'eventId') ||
    !isPositiveInteger(value['eventVersion']) ||
    !isNonNegativeInteger(value['assignedPositions']) ||
    !Array.isArray(value['positions']) ||
    !Array.isArray(value['volunteers']) ||
    !Array.isArray(value['assignments'])
  ) {
    throw new Error('The assignment-board response did not match the expected contract.');
  }

  return {
    eventId: value['eventId'] as string,
    eventVersion: value['eventVersion'],
    assignedPositions: value['assignedPositions'],
    positions: value['positions'].map(parsePosition),
    volunteers: value['volunteers'].map(parseVolunteer),
    assignments: value['assignments'].map(parseAssignment),
  };
}

export function parseAssignVolunteerResult(value: unknown): AssignVolunteerResult {
  if (
    !isRecord(value) ||
    !isPositiveInteger(value['eventVersion']) ||
    !isNonNegativeInteger(value['assignedPositions'])
  ) {
    throw new Error('The assignment response did not match the expected contract.');
  }

  return {
    assignment: parseAssignment(value['assignment']),
    eventVersion: value['eventVersion'],
    assignedPositions: value['assignedPositions'],
  };
}

export function parseAssignmentConflict(value: unknown): {
  readonly message: string;
  readonly board: AssignmentBoard;
} {
  if (!isRecord(value) || !hasString(value, 'message')) {
    throw new Error('The assignment-conflict response did not match the expected contract.');
  }

  return { message: value['message'] as string, board: parseAssignmentBoard(value['board']) };
}

function parsePosition(value: unknown): MinistryPosition {
  if (
    !isRecord(value) ||
    !hasString(value, 'id') ||
    !hasString(value, 'eventId') ||
    !hasString(value, 'ministry') ||
    !hasString(value, 'roleName') ||
    !hasDate(value, 'startsAt') ||
    !hasDate(value, 'endsAt')
  ) {
    throw new Error('The ministry-position response did not match the expected contract.');
  }

  return {
    id: value['id'] as string,
    eventId: value['eventId'] as string,
    ministry: value['ministry'] as string,
    roleName: value['roleName'] as string,
    startsAt: value['startsAt'] as string,
    endsAt: value['endsAt'] as string,
  };
}

function parseVolunteer(value: unknown): Volunteer {
  if (
    !isRecord(value) ||
    !hasString(value, 'id') ||
    !hasString(value, 'displayName') ||
    !Array.isArray(value['eligibleMinistries']) ||
    !value['eligibleMinistries'].every((item) => typeof item === 'string')
  ) {
    throw new Error('The volunteer response did not match the expected contract.');
  }

  return {
    id: value['id'] as string,
    displayName: value['displayName'] as string,
    eligibleMinistries: value['eligibleMinistries'] as string[],
  };
}

function parseAssignment(value: unknown): Assignment {
  if (
    !isRecord(value) ||
    !hasString(value, 'id') ||
    !hasString(value, 'positionId') ||
    !hasString(value, 'volunteerId') ||
    !hasString(value, 'volunteerDisplayName') ||
    (value['status'] !== 'accepted' && value['status'] !== 'declined')
  ) {
    throw new Error('The assignment response did not match the expected contract.');
  }

  return {
    id: value['id'] as string,
    positionId: value['positionId'] as string,
    volunteerId: value['volunteerId'] as string,
    volunteerDisplayName: value['volunteerDisplayName'] as string,
    status: value['status'],
    syncStatus: 'confirmed',
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string' && value[key].trim().length > 0;
}

function hasDate(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string' && !Number.isNaN(Date.parse(value[key]));
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}
