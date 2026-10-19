import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { CreateServiceEventCommand } from './create-service-event-command';
import { SessionState, SessionStore } from '../../core/auth/session-store';
import { Page } from './page';
import { ScheduleQuery } from './schedule-query';
import { ScheduleStore } from './schedule-store';
import { ServiceEventRepository } from './service-event-repository';
import { ServiceEvent } from './service-event';

describe('ScheduleStore', () => {
  const query: ScheduleQuery = { month: '2026-11', ministry: null, page: 1, pageSize: 4 };
  const event: ServiceEvent = {
    id: 'event-1',
    title: 'Sunday Morning Service',
    startsAt: '2026-11-01T10:00:00-05:00',
    endsAt: '2026-11-01T11:30:00-05:00',
    location: 'Main Sanctuary',
    requiredPositions: 10,
    assignedPositions: 7,
    version: 1,
  };
  const page = (items: readonly ServiceEvent[]): Page<ServiceEvent> => ({
    items,
    page: 1,
    pageSize: 4,
    totalItems: items.length,
  });
  let repository: {
    list: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  let store: ScheduleStore;
  const session = signal<SessionState>({
    status: 'authenticated',
    user: {
      id: 'coordinator-1',
      email: 'coordinator@churchserve.local',
      displayName: 'Demo Coordinator',
      roles: ['scheduler'],
    },
  });

  beforeEach(() => {
    session.set({
      status: 'authenticated',
      user: {
        id: 'coordinator-1',
        email: 'coordinator@churchserve.local',
        displayName: 'Demo Coordinator',
        roles: ['scheduler'],
      },
    });
    repository = {
      list: vi.fn(() => of(page([event]))),
      findById: vi.fn(() => of(event)),
      create: vi.fn(() => of(event)),
    };
    TestBed.configureTestingModule({
      providers: [
        ScheduleStore,
        { provide: ServiceEventRepository, useValue: repository },
        { provide: SessionStore, useValue: { session: session.asReadonly() } },
      ],
    });
    store = TestBed.inject(ScheduleStore);
  });

  it('loads a page and derives its open-position count', () => {
    store.load(query);
    expect(store.loadState()).toBe('loaded');
    expect(store.page()).toEqual(page([event]));
    expect(store.events()).toEqual([event]);
    expect(store.totalOpenPositions()).toBe(3);
  });

  it('does not start a duplicate request for the same pending or loaded query', () => {
    const response = new Subject<Page<ServiceEvent>>();
    repository.list.mockReturnValue(response);
    store.load(query);
    store.load({ ...query });
    response.next(page([event]));
    store.load({ ...query });
    expect(repository.list).toHaveBeenCalledTimes(1);
  });

  it('cancels the previous request when the query changes', () => {
    const firstResponse = new Subject<Page<ServiceEvent>>();
    const secondResponse = new Subject<Page<ServiceEvent>>();
    repository.list.mockReturnValueOnce(firstResponse).mockReturnValueOnce(secondResponse);
    store.load(query);
    store.load({ ...query, page: 2 });
    firstResponse.next(page([{ ...event, id: 'stale' }]));
    secondResponse.next(page([{ ...event, id: 'current' }]));
    expect(store.events()[0].id).toBe('current');
  });

  it('records a load failure and supports an explicit retry', () => {
    repository.list
      .mockReturnValueOnce(throwError(() => new Error('API unavailable')))
      .mockReturnValueOnce(of(page([event])));
    store.load(query);
    expect(store.loadState()).toBe('failed');
    expect(store.loadError()).toContain('could not be loaded');
    store.retry();
    expect(store.loadState()).toBe('loaded');
    expect(repository.list).toHaveBeenCalledTimes(2);
  });

  it('serves a loaded event from the cache without another repository request', () => {
    store.load(query);
    let resolved: ServiceEvent | undefined;
    store.findById(event.id).subscribe((value) => (resolved = value));
    expect(resolved).toBe(event);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('caches an event loaded directly by ID', () => {
    store.findById(event.id).subscribe();
    store.findById(event.id).subscribe();
    expect(repository.findById).toHaveBeenCalledTimes(1);
  });

  it('caches a newly created event for the detail resolver', () => {
    const command: CreateServiceEventCommand = {
      title: event.title,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.location,
    };
    store.create(command).subscribe();
    store.findById(event.id).subscribe();
    expect(repository.create).toHaveBeenCalledWith(command);
    expect(repository.findById).not.toHaveBeenCalled();
  });

  it('clears identity-bound state when the session becomes anonymous', () => {
    store.load(query);

    session.set({ status: 'anonymous' });
    TestBed.tick();

    expect(store.loadState()).toBe('idle');
    expect(store.query()).toBeNull();
    expect(store.page()).toBeNull();
    store.findById(event.id).subscribe();
    expect(repository.findById).toHaveBeenCalledOnce();
  });
});
