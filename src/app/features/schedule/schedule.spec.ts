import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { InMemoryServiceEventRepository } from './in-memory-service-event-repository';
import { Schedule } from './schedule';
import { ServiceEventRepository } from './service-event-repository';
import { ServiceEvent } from './service-event';

describe('Schedule', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ServiceEventRepository, useClass: InMemoryServiceEventRepository },
      ],
    });
  });

  it('renders the event collection with detail links', () => {
    const fixture = TestBed.createComponent(Schedule);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('app-service-event-card')).toHaveLength(2);
    expect(element.querySelector('app-service-event-card a')?.getAttribute('href')).toBe(
      '/schedule/sunday-2026-11-01',
    );
    expect(element.querySelector('.schedule-actions a')?.getAttribute('href')).toBe(
      '/schedule/new',
    );
  });

  it('shows a loading status without an empty-state message', () => {
    const fixture = TestBed.createComponent(Schedule);
    fixture.componentInstance.setStateForTest({ status: 'loading' });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Loading service schedule',
    );
    expect(element.textContent).not.toContain('No upcoming services');
    expect(element.querySelector('app-service-event-card')).toBeNull();
  });

  it('shows an error and reloads the seeded schedule', () => {
    const fixture = TestBed.createComponent(Schedule);
    fixture.componentInstance.setStateForTest({
      status: 'error',
      message: 'Please try again.',
    });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Please try again.');
    expect(element.textContent).not.toContain('No upcoming services');

    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.querySelectorAll('app-service-event-card')).toHaveLength(2);
  });

  it('shows the ready empty state only after loading succeeds', () => {
    const fixture = TestBed.createComponent(Schedule);
    fixture.componentInstance.setStateForTest({ status: 'ready', events: [] });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('No upcoming services');
    expect(element.querySelector('[role="status"]')).toBeNull();
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('keeps each card associated with its event when events are reordered', () => {
    const fixture = TestBed.createComponent(Schedule);
    const first: ServiceEvent = {
      id: 'event-1',
      title: 'First Service',
      startsAt: '2026-11-01T10:00:00-05:00',
      endsAt: '2026-11-01T11:00:00-05:00',
      location: 'Main Sanctuary',
      requiredPositions: 4,
      assignedPositions: 2,
    };
    const second: ServiceEvent = {
      ...first,
      id: 'event-2',
      title: 'Second Service',
    };

    fixture.componentInstance.setStateForTest({ status: 'ready', events: [first, second] });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const cardsBefore = Array.from(element.querySelectorAll('app-service-event-card'));

    fixture.componentInstance.setStateForTest({ status: 'ready', events: [second, first] });
    fixture.detectChanges();
    const cardsAfter = Array.from(element.querySelectorAll('app-service-event-card'));

    expect(cardsAfter[0]).toBe(cardsBefore[1]);
    expect(cardsAfter[1]).toBe(cardsBefore[0]);
  });
});
