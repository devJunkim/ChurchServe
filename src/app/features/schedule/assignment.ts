import { Volunteer } from '../../shared/domain/volunteer';

export interface MinistryPosition {
  readonly id: string;
  readonly eventId: string;
  readonly ministry: string;
  readonly roleName: string;
  readonly startsAt: string;
  readonly endsAt: string;
}

export interface Assignment {
  readonly id: string;
  readonly positionId: string;
  readonly volunteerId: string;
  readonly volunteerDisplayName: string;
  readonly status: 'accepted' | 'declined';
  readonly syncStatus: 'pending' | 'confirmed';
  readonly clientRequestId?: string;
}

export interface AssignmentBoard {
  readonly eventId: string;
  readonly eventVersion: number;
  readonly assignedPositions: number;
  readonly positions: readonly MinistryPosition[];
  readonly volunteers: readonly Volunteer[];
  readonly assignments: readonly Assignment[];
}

export interface AssignVolunteerCommand {
  readonly eventId: string;
  readonly positionId: string;
  readonly volunteerId: string;
  readonly expectedEventVersion: number;
  readonly clientRequestId: string;
}

export interface AssignVolunteerResult {
  readonly assignment: Assignment;
  readonly eventVersion: number;
  readonly assignedPositions: number;
}
