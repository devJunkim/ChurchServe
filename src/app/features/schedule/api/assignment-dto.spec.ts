import {
  parseAssignmentBoard,
  parseAssignmentConflict,
  parseAssignVolunteerResult,
} from './assignment-dto';

describe('assignment DTO parsing', () => {
  it('maps a valid assignment board and marks server assignments confirmed', () => {
    const board = parseAssignmentBoard(boardDto);

    expect(board.eventVersion).toBe(3);
    expect(board.positions[0].roleName).toBe('Sound operator');
    expect(board.volunteers[0].eligibleMinistries).toEqual(['technical']);
    expect(board.assignments[0].syncStatus).toBe('confirmed');
  });

  it('maps an assignment result and conflict board', () => {
    expect(
      parseAssignVolunteerResult({
        assignment: assignmentDto,
        eventVersion: 4,
        assignedPositions: 8,
      }),
    ).toEqual({
      assignment: expect.objectContaining({ id: 'assignment-1', syncStatus: 'confirmed' }),
      eventVersion: 4,
      assignedPositions: 8,
    });
    expect(
      parseAssignmentConflict({ message: 'The schedule changed.', board: boardDto }),
    ).toEqual({
      message: 'The schedule changed.',
      board: expect.objectContaining({ eventVersion: 3 }),
    });
  });

  it('rejects malformed nested contracts', () => {
    expect(() => parseAssignmentBoard({ ...boardDto, eventVersion: 0 })).toThrowError(
      'expected contract',
    );
    expect(() =>
      parseAssignmentBoard({
        ...boardDto,
        positions: [{ ...boardDto.positions[0], startsAt: 'not-a-date' }],
      }),
    ).toThrowError('expected contract');
    expect(() =>
      parseAssignmentBoard({
        ...boardDto,
        assignments: [{ ...assignmentDto, status: 'unknown' }],
      }),
    ).toThrowError('expected contract');
  });
});

const assignmentDto = {
  id: 'assignment-1',
  positionId: 'sound-1',
  volunteerId: 'alex',
  volunteerDisplayName: 'Alex Morgan',
  status: 'accepted',
};

const boardDto = {
  eventId: 'event-1',
  eventVersion: 3,
  assignedPositions: 7,
  positions: [
    {
      id: 'sound-1',
      eventId: 'event-1',
      ministry: 'technical',
      roleName: 'Sound operator',
      startsAt: '2026-11-01T14:30:00Z',
      endsAt: '2026-11-01T16:30:00Z',
    },
  ],
  volunteers: [
    {
      id: 'alex',
      displayName: 'Alex Morgan',
      eligibleMinistries: ['technical'],
    },
  ],
  assignments: [assignmentDto],
};
