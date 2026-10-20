import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, Routes } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { SessionState, SessionStore } from './core/auth/session-store';
import { NavigationUnavailable } from './features/navigation-unavailable/navigation-unavailable';
import { NotFound } from './features/not-found/not-found';
import { AssignmentRepository } from './features/schedule/assignment-repository';
import { AssignmentStore } from './features/schedule/assignment-store';
import { ServiceEventCreate } from './features/schedule/service-event-create/service-event-create';
import { ServiceEventDetail } from './features/schedule/service-event-detail/service-event-detail';
import { ServiceEventRepository } from './features/schedule/service-event-repository';
import { Schedule } from './features/schedule/schedule';
import { SCHEDULE_ROUTES } from './features/schedule/schedule.routes';
import { ScheduleStore } from './features/schedule/schedule-store';
import { FakeServiceEventRepository } from '../testing/fake-service-event-repository';
import { buildServiceEvent } from '../testing/service-event.builder';
import { routes } from './app.routes';

describe('application routes', () => {
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
  const event = buildServiceEvent();
  let repository: FakeServiceEventRepository;

  beforeEach(() => {
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
    repository = new FakeServiceEventRepository([event]);
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routesWithServiceEventRepository(repository)),
        {
          provide: SessionStore,
          useValue: {
            session: session.asReadonly(),
            ensureRestored: () => of(session()),
          },
        },
      ],
    });
  });

  it('loads the schedule and reuses its cached event in the detail resolver', async () => {
    const harness = await RouterTestingHarness.create();

    const schedule = await harness.navigateByUrl('/schedule?month=2026-11&page=1', Schedule);

    expect(schedule).toBeTruthy();
    expect(harness.routeNativeElement?.textContent).toContain('Sunday Morning Service');
    expect(harness.routeNativeElement?.textContent).toContain('3 open positions');
    expect(repository.listQueries).toEqual([
      { month: '2026-11', ministry: null, page: 1, pageSize: 4 },
    ]);

    await harness.navigateByUrl(`/schedule/${event.id}`, ServiceEventDetail);

    expect(harness.routeNativeElement?.textContent).toContain('Sunday Morning Service');
    expect(harness.routeNativeElement?.textContent).toContain('3 open positions');
    expect(repository.findByIdCalls).toEqual([]);
  });

  it('keeps schedule state outside the root injector', () => {
    expect(() => TestBed.inject(ScheduleStore)).toThrow();
    expect(() => TestBed.inject(AssignmentStore)).toThrow();
  });

  it('opens a service detail route with its ID', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl(
      '/schedule/sunday-2026-11-01',
      ServiceEventDetail,
    );

    expect(component).toBeTruthy();
    expect(harness.routeNativeElement?.textContent).toContain('Sunday Morning Service');
  });

  it('opens the dedicated service creation route', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/schedule/new', ServiceEventCreate);

    expect(component).toBeTruthy();
    expect(harness.routeNativeElement?.textContent).toContain('Create a service event');
  });

  it('redirects a reader away from the service creation route', async () => {
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
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    await harness.navigateByUrl('/schedule/new', NavigationUnavailable);

    expect(router.url).toBe('/unavailable');
    expect(harness.routeNativeElement?.textContent).toContain('temporarily unavailable');
  });

  it('redirects an unknown event ID to the not-found page', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/schedule/missing', NotFound);

    expect(component).toBeTruthy();
    expect(harness.routeNativeElement?.textContent).toContain('Page not found');
  });

  it('redirects anonymous users to sign-in and preserves the requested URL', async () => {
    session.set({ status: 'anonymous' });
    const harness = await RouterTestingHarness.create();
    const router = TestBed.inject(Router);

    await harness.navigateByUrl('/schedule/sunday-2026-11-01');

    expect(router.url).toBe('/sign-in?returnUrl=%2Fschedule%2Fsunday-2026-11-01');
    expect(harness.routeNativeElement?.textContent).toContain('Sign in to ChurchServe');
  });

  it('redirects a failed resolver to a retry page', async () => {
    repository.failFindByIdWith(new Error('API unavailable'));
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl(
      '/schedule/sunday-2026-11-01',
      NavigationUnavailable,
    );

    expect(component).toBeTruthy();
    expect(harness.routeNativeElement?.textContent).toContain('temporarily unavailable');
  });

  it('redirects an unknown URL to the not-found page', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/does-not-exist', NotFound);

    expect(component).toBeTruthy();
    expect(harness.routeNativeElement?.textContent).toContain('Page not found');
  });
});

function routesWithServiceEventRepository(repository: ServiceEventRepository): Routes {
  return routes.map((route) =>
    route.path === 'schedule'
      ? {
          ...route,
          loadChildren: async () =>
            SCHEDULE_ROUTES.map((featureRoute) => ({
              ...featureRoute,
              providers: [
                ScheduleStore,
                AssignmentStore,
                { provide: ServiceEventRepository, useValue: repository },
                {
                  provide: AssignmentRepository,
                  useValue: {
                    loadBoard: (eventId: string) =>
                      of({
                        eventId,
                        eventVersion: 1,
                        assignedPositions: 7,
                        positions: [],
                        volunteers: [],
                        assignments: [],
                      }),
                  },
                },
              ],
            })),
        }
      : route,
  );
}
