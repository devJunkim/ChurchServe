import { InMemoryServiceEventRepository } from './in-memory-service-event-repository';

describe('InMemoryServiceEventRepository', () => {
  let repository: InMemoryServiceEventRepository;

  beforeEach(() => {
    repository = new InMemoryServiceEventRepository();
  });

  it('finds a seeded event by its route ID', () => {
    expect(repository.findById('sunday-2026-11-01')?.title).toBe('Sunday Morning Service');
    expect(repository.findById('missing')).toBeUndefined();
  });

  it('creates an event with a client ID and immutable collection update', () => {
    const previousEvents = repository.list();

    const created = repository.create({
      title: 'Prayer Night',
      startsAt: '2026-11-06T19:00:00.000Z',
      endsAt: '2026-11-06T20:00:00.000Z',
      location: 'Chapel',
    });

    expect(created.id).toBeTruthy();
    expect(created.requiredPositions).toBe(0);
    expect(created.assignedPositions).toBe(0);
    expect(repository.list()).not.toBe(previousEvents);
    expect(repository.findById(created.id)).toEqual(created);
  });
});
