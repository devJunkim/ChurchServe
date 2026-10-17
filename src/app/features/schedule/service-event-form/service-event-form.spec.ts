import { TestBed } from '@angular/core/testing';
import { CreateServiceEventCommand } from '../create-service-event-command';
import { ServiceEventForm } from './service-event-form';

describe('ServiceEventForm', () => {
  it('rejects an end time before the start time', () => {
    const fixture = TestBed.createComponent(ServiceEventForm);
    const form = fixture.componentInstance.form;

    form.setValue({
      title: 'Sunday Service',
      startsAt: '2026-11-01T10:00',
      endsAt: '2026-11-01T09:00',
      location: 'Main Sanctuary',
    });

    expect(form.hasError('timeRange')).toBe(true);
  });

  it('does not emit an invalid command and reveals validation errors', () => {
    const fixture = TestBed.createComponent(ServiceEventForm);
    const emitted: CreateServiceEventCommand[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));

    fixture.componentInstance.submit();
    fixture.detectChanges();

    expect(emitted).toEqual([]);
    expect(fixture.componentInstance.form.controls.title.touched).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Enter a service name.');
  });

  it('treats whitespace-only names and locations as invalid', () => {
    const fixture = TestBed.createComponent(ServiceEventForm);
    const form = fixture.componentInstance.form;

    form.setValue({
      title: '   ',
      startsAt: '2026-11-01T10:00',
      endsAt: '2026-11-01T11:00',
      location: '\t',
    });

    expect(form.controls.title.hasError('blank')).toBe(true);
    expect(form.controls.location.hasError('blank')).toBe(true);
    expect(form.invalid).toBe(true);
  });

  it('trims text and normalizes timestamps before emitting a valid command', () => {
    const fixture = TestBed.createComponent(ServiceEventForm);
    const emitted: CreateServiceEventCommand[] = [];
    fixture.componentInstance.submitted.subscribe((value) => emitted.push(value));
    fixture.componentInstance.form.setValue({
      title: '  Sunday Service  ',
      startsAt: '2026-11-01T10:00',
      endsAt: '2026-11-01T11:30',
      location: '  Main Sanctuary  ',
    });

    fixture.componentInstance.submit();

    expect(emitted).toEqual([
      {
        title: 'Sunday Service',
        startsAt: new Date('2026-11-01T10:00').toISOString(),
        endsAt: new Date('2026-11-01T11:30').toISOString(),
        location: 'Main Sanctuary',
      },
    ]);
  });
});
