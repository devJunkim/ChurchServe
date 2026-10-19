import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AssignmentConflictError } from '../assignment-repository';
import { HttpAssignmentRepository } from './http-assignment-repository';

describe('HttpAssignmentRepository', () => {
  let repository: HttpAssignmentRepository;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), HttpAssignmentRepository],
    });
    repository = TestBed.inject(HttpAssignmentRepository);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('loads and parses an encoded event assignment board', async () => {
    const result = firstValueFrom(repository.loadBoard('event/one'));

    const request = http.expectOne('/api/service-events/event%2Fone/assignment-board');
    expect(request.request.method).toBe('GET');
    request.flush(boardDto('event/one'));

    await expect(result).resolves.toEqual(
      expect.objectContaining({ eventId: 'event/one', eventVersion: 3 }),
    );
  });

  it('posts concurrency and idempotency data and parses confirmation', async () => {
    const command = {
      eventId: 'event-1',
      positionId: 'sound-1',
      volunteerId: 'alex',
      expectedEventVersion: 3,
      clientRequestId: 'request-1',
    };
    const result = firstValueFrom(repository.assign(command));

    const request = http.expectOne('/api/service-events/event-1/assignments');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({
      positionId: 'sound-1',
      volunteerId: 'alex',
      expectedEventVersion: 3,
      clientRequestId: 'request-1',
    });
    request.flush({ assignment: assignmentDto, eventVersion: 4, assignedPositions: 8 });

    await expect(result).resolves.toEqual({
      assignment: expect.objectContaining({ id: 'assignment-1', syncStatus: 'confirmed' }),
      eventVersion: 4,
      assignedPositions: 8,
    });
  });

  it('converts a conflict response into an authoritative domain error', async () => {
    const result = firstValueFrom(
      repository.assign({
        eventId: 'event-1',
        positionId: 'sound-1',
        volunteerId: 'alex',
        expectedEventVersion: 3,
        clientRequestId: 'request-1',
      }),
    );

    http.expectOne('/api/service-events/event-1/assignments').flush(
      { message: 'The schedule changed.', board: boardDto('event-1') },
      { status: 409, statusText: 'Conflict' },
    );

    await expect(result).rejects.toBeInstanceOf(AssignmentConflictError);
    await expect(result).rejects.toMatchObject({
      message: 'The schedule changed.',
      board: expect.objectContaining({ eventVersion: 3 }),
    });
  });

  it('propagates non-conflict HTTP failures', async () => {
    const result = firstValueFrom(
      repository.assign({
        eventId: 'event-1',
        positionId: 'sound-1',
        volunteerId: 'alex',
        expectedEventVersion: 3,
        clientRequestId: 'request-1',
      }),
    );

    http.expectOne('/api/service-events/event-1/assignments').flush(null, {
      status: 500,
      statusText: 'Server Error',
    });

    await expect(result).rejects.toMatchObject({ status: 500 });
  });
});

const assignmentDto = {
  id: 'assignment-1',
  positionId: 'sound-1',
  volunteerId: 'alex',
  volunteerDisplayName: 'Alex Morgan',
  status: 'accepted',
};

function boardDto(eventId: string) {
  return {
    eventId,
    eventVersion: 3,
    assignedPositions: 7,
    positions: [
      {
        id: 'sound-1',
        eventId,
        ministry: 'technical',
        roleName: 'Sound operator',
        startsAt: '2026-11-01T14:30:00Z',
        endsAt: '2026-11-01T16:30:00Z',
      },
    ],
    volunteers: [
      { id: 'alex', displayName: 'Alex Morgan', eligibleMinistries: ['technical'] },
    ],
    assignments: [assignmentDto],
  };
}
