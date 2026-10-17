import { Assignment, MinistryPosition, Volunteer } from '../assignment';
import { ServiceEvent } from '../service-event';
import { KeyValueStorage } from './key-value-storage';

export const churchServeStorageKey = 'churchserve:schedule';

export interface ChurchServeLocalDataV1 {
  readonly version: 1;
  readonly events: readonly ServiceEvent[];
  readonly positions: readonly MinistryPosition[];
  readonly volunteers: readonly Volunteer[];
  readonly assignments: readonly Assignment[];
}

interface ChurchServeLocalDataV0 {
  readonly version: 0;
  readonly events: readonly ServiceEvent[];
}

const seedEvents: readonly ServiceEvent[] = [
  {
    id: 'sunday-2026-11-01',
    title: 'Sunday Morning Service',
    startsAt: '2026-11-01T10:00:00-05:00',
    endsAt: '2026-11-01T11:30:00-05:00',
    location: 'Main Sanctuary',
    requiredPositions: 10,
    assignedPositions: 7,
  },
  {
    id: 'rehearsal-2026-11-05',
    title: 'Worship Team Rehearsal',
    startsAt: '2026-11-05T19:00:00-05:00',
    endsAt: '2026-11-05T20:30:00-05:00',
    location: 'Music Room',
    requiredPositions: 6,
    assignedPositions: 6,
  },
];

export function createInitialLocalData(): ChurchServeLocalDataV1 {
  return {
    version: 1,
    events: [...seedEvents],
    positions: [],
    volunteers: [],
    assignments: [],
  };
}

export function readLocalData(storage: KeyValueStorage): ChurchServeLocalDataV1 {
  let raw: string | null;
  try {
    raw = storage.get(churchServeStorageKey);
  } catch {
    return createInitialLocalData();
  }

  if (raw === null) {
    return createInitialLocalData();
  }

  try {
    const candidate: unknown = JSON.parse(raw);
    if (isLocalDataV1(candidate)) {
      return candidate;
    }

    if (isLocalDataV0(candidate)) {
      const migrated = migrateV0ToV1(candidate);
      try {
        storage.set(churchServeStorageKey, JSON.stringify(migrated));
      } catch {
        // The migrated data remains usable for this session even if storage is unavailable.
      }
      return migrated;
    }
  } catch {
    // Recovery below intentionally ignores malformed data without logging its contents.
  }

  try {
    storage.remove(churchServeStorageKey);
  } catch {
    // Recovery can continue in memory even when removing the invalid value fails.
  }
  return createInitialLocalData();
}

export function isLocalDataV1(value: unknown): value is ChurchServeLocalDataV1 {
  if (!isRecord(value) || value['version'] !== 1) {
    return false;
  }

  const events = value['events'];
  const positions = value['positions'];
  const volunteers = value['volunteers'];
  const assignments = value['assignments'];
  if (
    !Array.isArray(events) ||
    !events.every(isServiceEvent) ||
    !hasUniqueIds(events) ||
    !Array.isArray(positions) ||
    !positions.every(isMinistryPosition) ||
    !hasUniqueIds(positions) ||
    !Array.isArray(volunteers) ||
    !volunteers.every(isVolunteer) ||
    !hasUniqueIds(volunteers) ||
    !Array.isArray(assignments) ||
    !assignments.every(isAssignment) ||
    !hasUniqueIds(assignments)
  ) {
    return false;
  }

  const eventIds = new Set(events.map((event) => event.id));
  const positionIds = new Set(positions.map((position) => position.id));
  const volunteerIds = new Set(volunteers.map((volunteer) => volunteer.id));
  return (
    positions.every((position) => eventIds.has(position.eventId)) &&
    assignments.every(
      (assignment) =>
        positionIds.has(assignment.positionId) && volunteerIds.has(assignment.volunteerId),
    )
  );
}

function isLocalDataV0(value: unknown): value is ChurchServeLocalDataV0 {
  return (
    isRecord(value) &&
    value['version'] === 0 &&
    Array.isArray(value['events']) &&
    value['events'].every(isServiceEvent) &&
    hasUniqueIds(value['events'])
  );
}

function migrateV0ToV1(data: ChurchServeLocalDataV0): ChurchServeLocalDataV1 {
  return {
    version: 1,
    events: data.events,
    positions: [],
    volunteers: [],
    assignments: [],
  };
}

function isServiceEvent(value: unknown): value is ServiceEvent {
  return (
    isRecord(value) &&
    hasNonEmptyString(value, 'id') &&
    hasNonEmptyString(value, 'title') &&
    hasNonEmptyString(value, 'startsAt') &&
    hasNonEmptyString(value, 'endsAt') &&
    hasNonEmptyString(value, 'location') &&
    isNonNegativeInteger(value['requiredPositions']) &&
    isNonNegativeInteger(value['assignedPositions'])
  );
}

function isMinistryPosition(value: unknown): value is MinistryPosition {
  return (
    isRecord(value) &&
    hasNonEmptyString(value, 'id') &&
    hasNonEmptyString(value, 'eventId') &&
    hasNonEmptyString(value, 'ministry') &&
    hasNonEmptyString(value, 'roleName') &&
    hasNonEmptyString(value, 'startsAt') &&
    hasNonEmptyString(value, 'endsAt')
  );
}

function isVolunteer(value: unknown): value is Volunteer {
  return (
    isRecord(value) &&
    hasNonEmptyString(value, 'id') &&
    hasNonEmptyString(value, 'displayName') &&
    Array.isArray(value['eligibleMinistries']) &&
    value['eligibleMinistries'].every(
      (ministry) => typeof ministry === 'string' && ministry.trim().length > 0,
    )
  );
}

function isAssignment(value: unknown): value is Assignment {
  return (
    isRecord(value) &&
    hasNonEmptyString(value, 'id') &&
    hasNonEmptyString(value, 'positionId') &&
    hasNonEmptyString(value, 'volunteerId') &&
    (value['status'] === 'proposed' ||
      value['status'] === 'accepted' ||
      value['status'] === 'declined')
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasNonEmptyString(value: Record<string, unknown>, key: string): boolean {
  return typeof value[key] === 'string' && value[key].trim().length > 0;
}

function isNonNegativeInteger(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function hasUniqueIds(values: readonly { readonly id: string }[]): boolean {
  return new Set(values.map((value) => value.id)).size === values.length;
}
