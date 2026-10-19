import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import {
  AssignmentBoard,
  AssignVolunteerCommand,
  AssignVolunteerResult,
} from '../assignment';
import { AssignmentRepository } from '../assignment-repository';
import { AssignmentStore } from '../assignment-store';
import { ServiceEvent } from '../service-event';
import { ServiceEventDetail } from './service-event-detail';

describe('ServiceEventDetail assignments', () => {
  it('renders an optimistic assignment and then confirms it', () => {
    const repository = new DetailAssignmentRepository();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        AssignmentStore,
        { provide: AssignmentRepository, useValue: repository },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { serviceEvent } }, data: of({ serviceEvent }) },
        },
      ],
    });
    const fixture = TestBed.createComponent(ServiceEventDetail);
    fixture.detectChanges();
    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;

    expect(fixture.nativeElement.textContent).toContain('Sound operator');
    expect(Array.from(select.options).map((option) => option.text)).toContain('Alex Morgan');

    select.value = 'alex';
    select.dispatchEvent(new Event('input'));
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector(
      '.assignment-action button',
    ) as HTMLButtonElement;
    expect(button.disabled).toBe(false);
    button.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Saving…');
    expect(repository.commands[0]).toEqual(
      expect.objectContaining({ expectedEventVersion: 3, volunteerId: 'alex' }),
    );

    repository.response.next({
      assignment: {
        id: 'assignment-1',
        positionId: 'sound-1',
        volunteerId: 'alex',
        volunteerDisplayName: 'Alex Morgan',
        status: 'accepted',
        syncStatus: 'confirmed',
      },
      eventVersion: 4,
      assignedPositions: 1,
    });
    repository.response.complete();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Confirmed');
    expect(fixture.nativeElement.textContent).toContain('Schedule version 4');
  });
});

const serviceEvent: ServiceEvent = {
  id: 'event-1',
  title: 'Sunday Service',
  startsAt: '2026-11-01T15:00:00Z',
  endsAt: '2026-11-01T16:30:00Z',
  location: 'Main Sanctuary',
  requiredPositions: 1,
  assignedPositions: 0,
  version: 3,
};

const board: AssignmentBoard = {
  eventId: 'event-1',
  eventVersion: 3,
  assignedPositions: 0,
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
    { id: 'alex', displayName: 'Alex Morgan', eligibleMinistries: ['technical'] },
  ],
  assignments: [],
};

class DetailAssignmentRepository extends AssignmentRepository {
  readonly response = new Subject<AssignVolunteerResult>();
  readonly commands: AssignVolunteerCommand[] = [];

  loadBoard() {
    return of(board);
  }

  assign(command: AssignVolunteerCommand) {
    this.commands.push(command);
    return this.response;
  }
}
