export interface MinistryPosition {
  readonly id: string;
  readonly eventId: string;
  readonly ministry: string;
  readonly roleName: string;
  readonly startsAt: string;
  readonly endsAt: string;
}

export interface Volunteer {
  readonly id: string;
  readonly displayName: string;
  readonly eligibleMinistries: readonly string[];
}

export interface Assignment {
  readonly id: string;
  readonly positionId: string;
  readonly volunteerId: string;
  readonly status: 'proposed' | 'accepted' | 'declined';
}
