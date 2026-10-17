import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { InMemoryServiceEventRepository } from '../in-memory-service-event-repository';
import { ServiceEventForm } from '../service-event-form/service-event-form';
import { ServiceEventRepository } from '../service-event-repository';
import { ServiceEventCreate } from './service-event-create';

describe('ServiceEventCreate', () => {
  it('stores a valid command and navigates to its detail URL', () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ServiceEventRepository, useClass: InMemoryServiceEventRepository },
      ],
    });
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const repository = TestBed.inject(ServiceEventRepository);
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

    const created = repository.list().at(-1);
    expect(created?.title).toBe('Prayer Night');
    expect(navigate).toHaveBeenCalledWith(['/schedule', created?.id]);
  });
});
