import { TestBed } from '@angular/core/testing';
import { ServiceEvent } from '../service-event';
import { ServiceEventCard } from './service-event-card';

describe('ServiceEventCard', () => {
  const event: ServiceEvent = {
    id: 'event-1',
    title: 'Sunday Morning Service',
    startsAt: '2026-11-01T10:00:00-05:00',
    endsAt: '2026-11-01T11:30:00-05:00',
    location: 'Main Sanctuary',
    requiredPositions: 10,
    assignedPositions: 7,
  };

  it('renders the event and open-position count', () => {
    const fixture = TestBed.createComponent(ServiceEventCard);
    fixture.componentRef.setInput('event', event);
    fixture.detectChanges();

    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Sunday Morning Service');
    expect(text).toContain('Main Sanctuary');
    expect(text).toContain('3 open positions');
  });

  it('emits the event ID when selected', () => {
    const fixture = TestBed.createComponent(ServiceEventCard);
    fixture.componentRef.setInput('event', event);
    const selected: string[] = [];
    fixture.componentInstance.selected.subscribe((id) => selected.push(id));
    fixture.detectChanges();

    fixture.nativeElement.querySelector('button').click();

    expect(selected).toEqual(['event-1']);
  });

  it('shows when an event is fully staffed', () => {
    const fixture = TestBed.createComponent(ServiceEventCard);
    fixture.componentRef.setInput('event', {
      ...event,
      assignedPositions: event.requiredPositions,
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Fully staffed');
    expect(fixture.nativeElement.textContent).not.toContain('open positions');
  });
});
