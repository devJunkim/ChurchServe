import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { ServiceEventForm } from '../service-event-form/service-event-form';
import { ServiceEventRepository } from '../service-event-repository';
import { ServiceEventCreate } from './service-event-create';

describe('ServiceEventCreate', () => {
  it('stores a valid command and navigates to its detail URL', () => {
    const repository = {
      list: vi.fn(),
      findById: vi.fn(),
      create: vi.fn(() =>
        of({
          id: 'event-1',
          title: 'Prayer Night',
          startsAt: '2026-11-06T19:00:00.000Z',
          endsAt: '2026-11-06T20:00:00.000Z',
          location: 'Chapel',
          requiredPositions: 0,
          assignedPositions: 0,
        }),
      ),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ServiceEventRepository, useValue: repository }],
    });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(ServiceEventCreate);
    fixture.detectChanges();
    const form = fixture.debugElement.query(By.directive(ServiceEventForm))
      .componentInstance as ServiceEventForm;

    form.form.setValue({
      title: '  Prayer Night  ',
      startsAt: '2026-11-06T19:00',
      endsAt: '2026-11-06T20:00',
      location: '  Chapel  ',
    });
    form.submit();

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Prayer Night', location: 'Chapel' }),
    );
    expect(navigate).toHaveBeenCalledWith(['/schedule', 'event-1']);
  });

  it('shows a recoverable error when persistence fails', () => {
    const repository = {
      list: () => of([]),
      findById: () => of(undefined),
      create: () => throwError(() => new Error('Network unavailable')),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ServiceEventRepository, useValue: repository }],
    });
    const fixture = TestBed.createComponent(ServiceEventCreate);
    fixture.detectChanges();
    const form = fixture.debugElement.query(By.directive(ServiceEventForm))
      .componentInstance as ServiceEventForm;
    form.form.setValue({
      title: 'Prayer Night',
      startsAt: '2026-11-06T19:00',
      endsAt: '2026-11-06T20:00',
      location: 'Chapel',
    });

    form.submit();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'could not be created',
    );
  });
});
