import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, RouterOutlet } from '@angular/router';
import { RouteFocus } from './route-focus';

@Component({
  template: '<h1>Schedule</h1><button type="button">Filter schedule</button>',
})
class SchedulePage {}

@Component({
  imports: [RouteFocus, RouterOutlet],
  template: '<main appRouteFocus><router-outlet /></main>',
})
class RouteFocusHost {}

describe('RouteFocus', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([{ path: 'schedule', component: SchedulePage }])],
    });
  });

  it('moves focus to the page heading after path navigation', async () => {
    const fixture = TestBed.createComponent(RouteFocusHost);
    const router = TestBed.inject(Router);
    fixture.detectChanges();

    await router.navigateByUrl('/schedule');
    fixture.detectChanges();
    await waitForScheduledFocus();

    expect(document.activeElement?.tagName).toBe('H1');
    expect(document.activeElement?.textContent).toContain('Schedule');
    expect(document.activeElement?.getAttribute('tabindex')).toBe('-1');
  });

  it('does not steal focus when only query parameters change', async () => {
    const fixture = TestBed.createComponent(RouteFocusHost);
    const router = TestBed.inject(Router);
    fixture.detectChanges();
    await router.navigateByUrl('/schedule?month=2026-11');
    fixture.detectChanges();
    await waitForScheduledFocus();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    button.focus();

    await router.navigateByUrl('/schedule?month=2026-12');
    fixture.detectChanges();
    await waitForScheduledFocus();

    expect(document.activeElement).toBe(button);
  });
});

function waitForScheduledFocus(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve));
}
