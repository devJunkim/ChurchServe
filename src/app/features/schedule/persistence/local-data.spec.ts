import { Assignment, MinistryPosition, Volunteer } from '../assignment';
import { ServiceEvent } from '../service-event';
import { KeyValueStorage } from './key-value-storage';
import {
  ChurchServeLocalDataV1,
  churchServeStorageKey,
  createInitialLocalData,
  isLocalDataV1,
  readLocalData,
} from './local-data';

class MemoryStorage extends KeyValueStorage {
  readonly values = new Map<string, string>();

  get(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  set(key: string, value: string): void {
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}

describe('local schedule data', () => {
  it('returns seeded data when storage is empty', () => {
    const data = readLocalData(new MemoryStorage());

    expect(data.version).toBe(1);
    expect(data.events).toHaveLength(2);
  });

  it('removes malformed JSON and recovers with seeded data', () => {
    const storage = new MemoryStorage();
    storage.set(churchServeStorageKey, '{broken');

    expect(readLocalData(storage)).toEqual(createInitialLocalData());
    expect(storage.get(churchServeStorageKey)).toBeNull();
  });

  it('rejects an unsupported schema version', () => {
    const storage = new MemoryStorage();
    storage.set(churchServeStorageKey, JSON.stringify({ version: 99 }));

    expect(readLocalData(storage)).toEqual(createInitialLocalData());
  });

  it('migrates a valid version zero document and saves version one', () => {
    const storage = new MemoryStorage();
    const event = createInitialLocalData().events[0];
    storage.set(churchServeStorageKey, JSON.stringify({ version: 0, events: [event] }));

    const migrated = readLocalData(storage);

    expect(migrated).toEqual({
      version: 1,
      events: [event],
      positions: [],
      volunteers: [],
      assignments: [],
    });
    expect(JSON.parse(storage.get(churchServeStorageKey) ?? '')).toEqual(migrated);
  });

  it('rejects duplicate IDs', () => {
    const data = createInitialLocalData();
    const duplicate = { ...data, events: [data.events[0], data.events[0]] };

    expect(isLocalDataV1(duplicate)).toBe(false);
  });

  it('rejects invalid assignment status and broken relationships', () => {
    const event: ServiceEvent = createInitialLocalData().events[0];
    const position: MinistryPosition = {
      id: 'position-1',
      eventId: event.id,
      ministry: 'technical',
      roleName: 'Sound operator',
      startsAt: event.startsAt,
      endsAt: event.endsAt,
    };
    const volunteer: Volunteer = {
      id: 'volunteer-1',
      displayName: 'Alex',
      eligibleMinistries: ['technical'],
    };
    const assignment: Assignment = {
      id: 'assignment-1',
      positionId: position.id,
      volunteerId: volunteer.id,
      status: 'accepted',
    };
    const valid: ChurchServeLocalDataV1 = {
      version: 1,
      events: [event],
      positions: [position],
      volunteers: [volunteer],
      assignments: [assignment],
    };

    expect(isLocalDataV1(valid)).toBe(true);
    expect(
      isLocalDataV1({
        ...valid,
        assignments: [{ ...assignment, status: 'unknown' }],
      }),
    ).toBe(false);
    expect(isLocalDataV1({ ...valid, positions: [{ ...position, eventId: 'missing' }] })).toBe(
      false,
    );
  });
});
