import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { AssignmentBoard, AssignVolunteerCommand, AssignVolunteerResult } from '../assignment';
import { AssignmentRepository } from '../assignment-repository';
import { AssignmentStore } from '../assignment-store';
import { ServiceEvent } from '../service-event';
import { ServiceEventDetail } from './service-event-detail';
import { SessionState, SessionStore } from '../../../core/auth/session-store';
import { expectNoAccessibilityViolations } from '../../../../testing/expect-no-accessibility-violations';

describe('ServiceEventDetail assignments', () => {
  const session = signal<SessionState>({
    status: 'authenticated',
    user: {
      id: 'coordinator-1',
      email: 'coordinator@churchserve.local',
      displayName: 'Demo Coordinator',
      roles: ['scheduler'],
      permissions: ['schedule.read', 'schedule.manage', 'volunteer.read', 'volunteer.manage'],
    },
  });

  it('renders an optimistic assignment, preserves focus, and then confirms it', async () => {
    const repository = new DetailAssignmentRepository();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        AssignmentStore,
        { provide: SessionStore, useValue: { session: session.asReadonly() } },
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
    await new Promise((resolve) => setTimeout(resolve));

    expect(fixture.nativeElement.textContent).toContain('Saving…');
    expect(document.activeElement?.id).toBe('position-sound-1');
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

  it('shows staffing without assignment controls to a read-only user', () => {
    const repository = new DetailAssignmentRepository();
    session.set({
      status: 'authenticated',
      user: {
        id: 'reader-1',
        email: 'reader@churchserve.local',
        displayName: 'Schedule Reader',
        roles: ['reader'],
        permissions: ['schedule.read', 'volunteer.read'],
      },
    });
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        AssignmentStore,
        { provide: SessionStore, useValue: { session: session.asReadonly() } },
        { provide: AssignmentRepository, useValue: repository },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { serviceEvent } }, data: of({ serviceEvent }) },
        },
      ],
    });
    const fixture = TestBed.createComponent(ServiceEventDetail);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Unfilled');
    expect(fixture.nativeElement.querySelector('[data-action="assign"]')).toBeNull();
    expect(fixture.nativeElement.querySelector('.assignment-action')).toBeNull();
  });

  it('has no automatically detectable accessibility violations on the assignment board', async () => {
    session.set({
      status: 'authenticated',
      user: {
        id: 'coordinator-1',
        email: 'coordinator@churchserve.local',
        displayName: 'Demo Coordinator',
        roles: ['scheduler'],
        permissions: ['schedule.read', 'schedule.manage', 'volunteer.read', 'volunteer.manage'],
      },
    });
    const repository = new DetailAssignmentRepository();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        AssignmentStore,
        { provide: SessionStore, useValue: { session: session.asReadonly() } },
        { provide: AssignmentRepository, useValue: repository },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { data: { serviceEvent } }, data: of({ serviceEvent }) },
        },
      ],
    });
    const fixture = TestBed.createComponent(ServiceEventDetail);
    fixture.detectChanges();

    await expectNoAccessibilityViolations(fixture.nativeElement);
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
  volunteers: [{ id: 'alex', displayName: 'Alex Morgan', eligibleMinistries: ['technical'] }],
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
