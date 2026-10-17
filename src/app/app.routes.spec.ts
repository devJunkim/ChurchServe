import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { NotFound } from './features/not-found/not-found';
import { ServiceEventCreate } from './features/schedule/service-event-create/service-event-create';
import { ServiceEventDetail } from './features/schedule/service-event-detail/service-event-detail';
import { ServiceEventRepository } from './features/schedule/service-event-repository';
import { routes } from './app.routes';

describe('application routes', () => {
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
    const repository = {
      list: () => of([event]),
      findById: (id: string) => of(id === event.id ? event : undefined),
      create: () => of(event),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), { provide: ServiceEventRepository, useValue: repository }],
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

  it('shows a specific missing-event state for an unknown event ID', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/schedule/missing', ServiceEventDetail);

    expect(harness.routeNativeElement?.textContent).toContain('Service not found');
  });

  it('redirects an unknown URL to the not-found page', async () => {
    const harness = await RouterTestingHarness.create();

    const component = await harness.navigateByUrl('/does-not-exist', NotFound);

    expect(component).toBeTruthy();
    expect(harness.routeNativeElement?.textContent).toContain('Page not found');
  });
});
