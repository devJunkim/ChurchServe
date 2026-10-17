import { KeyValueStorage } from './key-value-storage';
import { churchServeStorageKey } from './local-data';
import { LocalStorageServiceEventRepository } from './local-storage-service-event-repository';

class MemoryStorage extends KeyValueStorage {
  readonly values = new Map<string, string>();
  failWrites = false;

  get(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  set(key: string, value: string): void {
    if (this.failWrites) {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    }
    this.values.set(key, value);
  }

  remove(key: string): void {
    this.values.delete(key);
  }
}

describe('LocalStorageServiceEventRepository', () => {
  const command = {
    title: 'Prayer Night',
    startsAt: '2026-11-06T19:00:00.000Z',
    endsAt: '2026-11-06T20:00:00.000Z',
    location: 'Chapel',
  };

  it('persists a created event and restores it in a new repository', () => {
    const storage = new MemoryStorage();
    const repository = new LocalStorageServiceEventRepository(storage);

    const created = repository.create(command);
    const restored = new LocalStorageServiceEventRepository(storage);

    expect(restored.findById(created.id)).toEqual(created);
    expect(JSON.parse(storage.get(churchServeStorageKey) ?? '').version).toBe(1);
  });

  it('does not change memory when persistence fails', () => {
    const storage = new MemoryStorage();
    const repository = new LocalStorageServiceEventRepository(storage);
    const previousEvents = repository.list();
    storage.failWrites = true;

    expect(() => repository.create(command)).toThrowError('Quota exceeded');
    expect(repository.list()).toBe(previousEvents);
    expect(repository.findById(previousEvents[0].id)).toEqual(previousEvents[0]);
  });
});
