import { Volunteer } from '../volunteers/volunteer';
import { Assignment, MinistryPosition } from './assignment';
import { AssignmentStore, validateAssignment } from './assignment-store';

describe('validateAssignment', () => {
  const positions: readonly MinistryPosition[] = [
    {
      id: 'sound-1',
      eventId: 'event-1',
      ministry: 'technical',
      roleName: 'Sound operator',
      startsAt: '2026-11-01T09:30:00-05:00',
      endsAt: '2026-11-01T11:30:00-05:00',
    },
  ];

  const volunteers: readonly Volunteer[] = [
    {
      id: 'technical-volunteer',
      displayName: 'Alex',
      eligibleMinistries: ['technical'],
    },
    {
      id: 'welcome-volunteer',
      displayName: 'Jordan',
      eligibleMinistries: ['welcome'],
    },
  ];

  it('rejects an unknown position', () => {
    expect(validateAssignment('missing', 'technical-volunteer', positions, volunteers, [])).toEqual(
      {
        valid: false,
        message: 'Position was not found.',
      },
    );
  });

  it('rejects an unknown volunteer', () => {
    expect(validateAssignment('sound-1', 'missing', positions, volunteers, [])).toEqual({
      valid: false,
      message: 'Volunteer was not found.',
    });
  });

  it('rejects a volunteer outside the required ministry', () => {
    expect(validateAssignment('sound-1', 'welcome-volunteer', positions, volunteers, [])).toEqual({
      valid: false,
      message: 'Volunteer is not eligible for this ministry.',
    });
  });

  it('rejects a position occupied by an active assignment', () => {
    const assignments: readonly Assignment[] = [
      {
        id: 'assignment-1',
        positionId: 'sound-1',
        volunteerId: 'technical-volunteer',
        status: 'accepted',
      },
    ];

    expect(
      validateAssignment('sound-1', 'technical-volunteer', positions, volunteers, assignments),
    ).toEqual({
      valid: false,
      message: 'Position already has an assignment.',
    });
  });

  it('allows a declined assignment to be replaced', () => {
    const assignments: readonly Assignment[] = [
      {
        id: 'assignment-1',
        positionId: 'sound-1',
        volunteerId: 'technical-volunteer',
        status: 'declined',
      },
    ];

    expect(
      validateAssignment('sound-1', 'technical-volunteer', positions, volunteers, assignments),
    ).toEqual({ valid: true });
  });
});

describe('AssignmentStore', () => {
  it('removes a position from the open list after assignment', () => {
    const store = createSeededAssignmentStore();
    const originalAssignments = store.assignments();

    store.assign('sound-1', 'technical-volunteer');

    expect(store.openPositions().map((position) => position.id)).not.toContain('sound-1');
    expect(store.assignments()).not.toBe(originalAssignments);
    expect(store.assignments()).toEqual([
      expect.objectContaining({
        positionId: 'sound-1',
        volunteerId: 'technical-volunteer',
        status: 'proposed',
      }),
    ]);
  });

  it('reopens a position when its assignment is declined', () => {
    const store = createSeededAssignmentStore();
    store.assign('sound-1', 'technical-volunteer');
    const assignmentId = store.assignments()[0].id;

    store.decline(assignmentId);

    expect(store.assignments()[0].status).toBe('declined');
    expect(store.openPositions().map((position) => position.id)).toContain('sound-1');
  });

  it('leaves state unchanged when assignment validation fails', () => {
    const store = createSeededAssignmentStore();
    const originalAssignments = store.assignments();
    const originalOpenPositions = store.openPositions();

    expect(() => store.assign('sound-1', 'welcome-volunteer')).toThrowError(
      'Volunteer is not eligible for this ministry.',
    );
    expect(store.assignments()).toBe(originalAssignments);
    expect(store.openPositions()).toBe(originalOpenPositions);
  });

  it('leaves state unchanged when declining an unknown assignment', () => {
    const store = createSeededAssignmentStore();
    const originalAssignments = store.assignments();

    expect(() => store.decline('missing')).toThrowError('Assignment was not found.');
    expect(store.assignments()).toBe(originalAssignments);
  });
});

function createSeededAssignmentStore(): AssignmentStore {
  return new AssignmentStore({
    positions: [
      {
        id: 'sound-1',
        eventId: 'event-1',
        ministry: 'technical',
        roleName: 'Sound operator',
        startsAt: '2026-11-01T09:30:00-05:00',
        endsAt: '2026-11-01T11:30:00-05:00',
      },
    ],
    volunteers: [
      {
        id: 'technical-volunteer',
        displayName: 'Alex',
        eligibleMinistries: ['technical'],
      },
      {
        id: 'welcome-volunteer',
        displayName: 'Jordan',
        eligibleMinistries: ['welcome'],
      },
    ],
    assignments: [],
  });
}
