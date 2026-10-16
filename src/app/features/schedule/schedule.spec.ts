import { TestBed } from '@angular/core/testing';
import { Schedule } from './schedule';

describe('Schedule', () => {
  it('renders the event collection and owns card selection', () => {
    const fixture = TestBed.createComponent(Schedule);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('app-service-event-card')).toHaveLength(2);

    element.querySelector<HTMLButtonElement>('app-service-event-card button')?.click();
    fixture.detectChanges();

    expect(element.querySelector('[role="status"]')?.textContent).toContain(
      'Sunday Morning Service selected',
    );
  });
});
