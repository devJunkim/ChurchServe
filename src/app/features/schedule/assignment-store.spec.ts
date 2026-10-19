import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { SessionState, SessionStore } from '../../core/auth/session-store';
import { CACHE_CLOCK } from '../../core/data/cache-clock';
import { Volunteer } from '../../shared/domain/volunteer';
import {
  Assignment,
  AssignmentBoard,
  AssignVolunteerCommand,
  AssignVolunteerResult,
  MinistryPosition,
} from './assignment';
import { AssignmentConflictError, AssignmentRepository } from './assignment-repository';
import { AssignmentStore, validateAssignment } from './assignment-store';

describe('validateAssignment', () => {
  it('rejects unknown positions and volunteers', () => {
    expect(validateAssignment('missing', 'alex', positions, volunteers, [])).toEqual({
      valid: false,
      message: 'Position was not found.',
    });
    expect(validateAssignment('sound-1', 'missing', positions, volunteers, [])).toEqual({
      valid: false,
      message: 'Volunteer was not found.',
    });
  });

  it('rejects ineligible volunteers and occupied positions', () => {
    expect(validateAssignment('sound-1', 'jordan', positions, volunteers, [])).toEqual({
      valid: false,
      message: 'Volunteer is not eligible for this ministry.',
    });
    expect(validateAssignment('sound-1', 'alex', positions, volunteers, [confirmed])).toEqual({
      valid: false,
      message: 'Position already has an assignment.',
    });
  });

  it('allows a declined assignment to be replaced', () => {
    expect(
      validateAssignment('sound-1', 'alex', positions, volunteers, [
        { ...confirmed, status: 'declined' },
      ]),
    ).toEqual({ valid: true });
  });
});

describe('AssignmentStore', () => {
  let repository: FakeAssignmentRepository;
  let store: AssignmentStore;
  let now: number;
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
    now = 1_000;
    session.set({
      status: 'authenticated',
      user: {
        id: 'coordinator-1',
        email: 'coordinator@churchserve.local',
        displayName: 'Demo Coordinator',
        roles: ['scheduler'],
      },
    });
    repository = new FakeAssignmentRepository();
    TestBed.configureTestingModule({
      providers: [
        AssignmentStore,
        { provide: AssignmentRepository, useValue: repository },
        { provide: SessionStore, useValue: { session: session.asReadonly() } },
        { provide: CACHE_CLOCK, useValue: () => now },
      ],
    });
    store = TestBed.inject(AssignmentStore);
  });

  it('loads the assignment board', () => {
    store.load('event-1');
    expect(store.loading()).toBe(true);

    repository.loadResponses[0].next(board());
    repository.loadResponses[0].complete();

    expect(store.loading()).toBe(false);
    expect(store.eventVersion()).toBe(3);
    expect(store.positions()).toEqual(positions);
    expect(store.openPositions()).toEqual(positions);
  });

  it('shares a pending load and reuses a fresh assignment board', () => {
    store.load('event-1');
    store.load('event-1');
    expect(repository.loadResponses).toHaveLength(1);

    repository.loadResponses[0].next(board());
    repository.loadResponses[0].complete();
    store.load('event-1');

    expect(repository.loadResponses).toHaveLength(1);
    expect(store.eventVersion()).toBe(3);
  });

  it('refreshes an assignment board after its freshness window expires', () => {
    loadBoard(store, repository);
    now += 15_001;

    store.load('event-1');

    expect(repository.loadResponses).toHaveLength(2);
  });

  it('exposes a recoverable loading error', () => {
    store.load('event-1');
    repository.loadResponses[0].error(new Error('offline'));

    expect(store.loading()).toBe(false);
    expect(store.loadError()).toContain('could not be loaded');
  });

  it('adds a pending assignment immediately and sends the current version', () => {
    loadBoard(store, repository);

    store.assign('sound-1', 'alex');

    expect(store.assignmentFor('sound-1')).toEqual(
      expect.objectContaining({
        volunteerId: 'alex',
        volunteerDisplayName: 'Alex',
        syncStatus: 'pending',
      }),
    );
    expect(store.openPositions()).toEqual([]);
    expect(repository.commands[0]).toEqual(
      expect.objectContaining({
        eventId: 'event-1',
        positionId: 'sound-1',
        volunteerId: 'alex',
        expectedEventVersion: 3,
      }),
    );
    expect(repository.commands[0].clientRequestId).toBeTruthy();
  });

  it('replaces only the matching pending assignment after confirmation', () => {
    loadBoard(store, repository);
    store.assign('sound-1', 'alex');

    repository.assignResponses[0].next({
      assignment: confirmed,
      eventVersion: 4,
      assignedPositions: 8,
    });
    repository.assignResponses[0].complete();

    expect(store.assignments()).toEqual([confirmed]);
    expect(store.eventVersion()).toBe(4);
    expect(store.notice()).toBe('Alex was assigned.');
  });

  it('rolls back only the failed optimistic operation', () => {
    const twoPositionBoard = board({
      positions: [...positions, { ...positions[0], id: 'camera-1', roleName: 'Camera operator' }],
    });
    loadBoard(store, repository, twoPositionBoard);
    store.assign('sound-1', 'alex');
    store.assign('camera-1', 'alex');

    repository.assignResponses[0].error(new Error('offline'));

    expect(store.assignments()).toHaveLength(1);
    expect(store.assignments()[0].positionId).toBe('camera-1');
    expect(store.notice()).toContain('not saved');
  });

  it('reloads from the server after a failed mutation invalidates the board', () => {
    loadBoard(store, repository);
    store.assign('sound-1', 'alex');
    repository.assignResponses[0].error(new Error('offline'));

    store.load('event-1');

    expect(repository.loadResponses).toHaveLength(2);
  });

  it('reconciles authoritative state after a conflict', () => {
    loadBoard(store, repository);
    store.assign('sound-1', 'alex');
    const authoritative = board({ eventVersion: 4, assignments: [confirmed] });

    repository.assignResponses[0].error(
      new AssignmentConflictError('The schedule changed.', authoritative),
    );

    expect(store.assignments()).toEqual([confirmed]);
    expect(store.eventVersion()).toBe(4);
    expect(store.notice()).toContain('latest assignments');
  });

  it('blocks duplicate clicks while the first assignment is pending', () => {
    loadBoard(store, repository);
    store.assign('sound-1', 'alex');

    expect(() => store.assign('sound-1', 'alex')).toThrowError(
      'Position already has an assignment.',
    );
    expect(repository.commands).toHaveLength(1);
  });

  it('requires a loaded board and filters eligible volunteers', () => {
    expect(() => store.assign('sound-1', 'alex')).toThrowError(
      'The assignment board is not loaded.',
    );
    loadBoard(store, repository);

    const firstRead = store.volunteersFor(positions[0]);
    const secondRead = store.volunteersFor(positions[0]);

    expect(firstRead.map((item) => item.id)).toEqual(['alex']);
    expect(secondRead).toBe(firstRead);
  });

  it('indexes active assignments by position', () => {
    const declined: Assignment = {
      ...confirmed,
      id: 'declined-1',
      positionId: 'camera-1',
      status: 'declined',
    };
    loadBoard(store, repository, board({ assignments: [confirmed, declined] }));

    expect(store.assignmentFor('sound-1')).toBe(confirmed);
    expect(store.assignmentFor('camera-1')).toBeUndefined();
  });

  it('clears cached assignment data when the authenticated identity changes', () => {
    loadBoard(store, repository);

    session.set({ status: 'anonymous' });
    TestBed.tick();

    expect(store.positions()).toEqual([]);
    expect(store.assignments()).toEqual([]);
    store.load('event-1');
    expect(repository.loadResponses).toHaveLength(2);
  });
});

const positions: readonly MinistryPosition[] = [
  {
    id: 'sound-1',
    eventId: 'event-1',
    ministry: 'technical',
    roleName: 'Sound operator',
    startsAt: '2026-11-01T14:30:00Z',
    endsAt: '2026-11-01T16:30:00Z',
  },
];

const volunteers: readonly Volunteer[] = [
  { id: 'alex', displayName: 'Alex', eligibleMinistries: ['technical'] },
  { id: 'jordan', displayName: 'Jordan', eligibleMinistries: ['welcome'] },
];

const confirmed: Assignment = {
  id: 'assignment-1',
  positionId: 'sound-1',
  volunteerId: 'alex',
  volunteerDisplayName: 'Alex',
  status: 'accepted',
  syncStatus: 'confirmed',
};

function board(overrides: Partial<AssignmentBoard> = {}): AssignmentBoard {
  return {
    eventId: 'event-1',
    eventVersion: 3,
    assignedPositions: 7,
    positions,
    volunteers,
    assignments: [],
    ...overrides,
  };
}

function loadBoard(
  store: AssignmentStore,
  repository: FakeAssignmentRepository,
  value = board(),
): void {
  store.load(value.eventId);
  repository.loadResponses.at(-1)!.next(value);
  repository.loadResponses.at(-1)!.complete();
}

class FakeAssignmentRepository extends AssignmentRepository {
  readonly loadResponses: Subject<AssignmentBoard>[] = [];
  readonly assignResponses: Subject<AssignVolunteerResult>[] = [];
  readonly commands: AssignVolunteerCommand[] = [];

  loadBoard(): Observable<AssignmentBoard> {
    const response = new Subject<AssignmentBoard>();
    this.loadResponses.push(response);
    return response;
  }

  assign(command: AssignVolunteerCommand): Observable<AssignVolunteerResult> {
    this.commands.push(command);
    const response = new Subject<AssignVolunteerResult>();
    this.assignResponses.push(response);
    return response;
  }
}
