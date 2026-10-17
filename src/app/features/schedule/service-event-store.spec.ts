import { TestBed } from '@angular/core/testing';
import { ServiceEventStore } from './service-event-store';

describe('ServiceEventStore', () => {
  it('finds a seeded event by its route ID', () => {
    const store = TestBed.inject(ServiceEventStore);

    expect(store.findById('sunday-2026-11-01')?.title).toBe('Sunday Morning Service');
    expect(store.findById('missing')).toBeUndefined();
  });

  it('creates an event with a client ID and immutable collection update', () => {
    const store = TestBed.inject(ServiceEventStore);
    const previousEvents = store.events();

    const created = store.create({
      title: 'Prayer Night',
      startsAt: '2026-11-06T19:00:00.000Z',
      endsAt: '2026-11-06T20:00:00.000Z',
      location: 'Chapel',
    });

    expect(created.id).toBeTruthy();
    expect(store.events()).not.toBe(previousEvents);
    expect(store.findById(created.id)).toEqual(created);
  });
});
