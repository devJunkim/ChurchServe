import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of, throwError } from 'rxjs';
import { SessionState, SessionStore } from './core/auth/session-store';
import { NavigationUnavailable } from './features/navigation-unavailable/navigation-unavailable';
import { NotFound } from './features/not-found/not-found';
import { ServiceEventCreate } from './features/schedule/service-event-create/service-event-create';
import { ServiceEventDetail } from './features/schedule/service-event-detail/service-event-detail';
import { ServiceEventRepository } from './features/schedule/service-event-repository';
import { routes } from './app.routes';

describe('application routes', () => {
  const session = signal<SessionState>({
    status: 'authenticated',
    user: {
      id: 'coordinator-1',
      email: 'coordinator@churchserve.local',
      displayName: 'Demo Coordinator',
      roles: ['scheduler'],
    },
  });
  let repository: ServiceEventRepository;

  beforeEach(() => {
    const event = {
      id: 'sunday-2026-11-01',
      title: 'Sunday Morning Service',
      startsAt: '2026-11-01T10:00:00-05:00',
      endsAt: '2026-11-01T11:30:00-05:00',
      location: 'Main Sanctuary',
      requiredPositions: 10,
      assignedPositions: 7,
    };
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
      list: () => of({ items: [event], page: 1, pageSize: 4, totalItems: 1 }),
      findById: (id: string) => of(id === event.id ? event : undefined),
      create: () => of(event),
    } as ServiceEventRepository;
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: ServiceEventRepository, useValue: repository },
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

    expect(router.url).toBe(
      '/sign-in?returnUrl=%2Fschedule%2Fsunday-2026-11-01',
    );
    expect(harness.routeNativeElement?.textContent).toContain('Sign in to ChurchServe');
  });

  it('redirects a failed resolver to a retry page', async () => {
    repository.findById = () => throwError(() => new Error('API unavailable'));
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
