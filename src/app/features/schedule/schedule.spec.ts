import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { Schedule } from './schedule';
import { ServiceEventRepository } from './service-event-repository';
import { ServiceEvent } from './service-event';

describe('Schedule', () => {
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
  let repository: {
    list: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
  const page = (items: readonly ServiceEvent[], currentPage = 1, totalItems = items.length) => ({
    items,
    page: currentPage,
    pageSize: 4,
    totalItems,
  });

  beforeEach(() => {
    repository = {
      list: vi.fn(() => of(page([first, second]))),
      findById: vi.fn((id: string) => of([first, second].find((event) => event.id === id))),
      create: vi.fn(),
    };
    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: ServiceEventRepository, useValue: repository }],
    });
  });

  it('renders the event collection with detail links', () => {
    const fixture = TestBed.createComponent(Schedule);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('app-service-event-card')).toHaveLength(2);
    expect(element.querySelector('app-service-event-card a')?.getAttribute('href')).toBe(
      '/schedule/event-1',
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
    expect(element.textContent).not.toContain('No matching services');
    expect(element.querySelector('app-service-event-card')).toBeNull();
  });

  it('shows an error and reloads the seeded schedule', () => {
    repository.list
      .mockReturnValueOnce(throwError(() => new Error('Network unavailable')))
      .mockReturnValue(of(page([first, second])));
    const fixture = TestBed.createComponent(Schedule);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('could not be loaded');
    expect(element.textContent).not.toContain('No matching services');

    element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click();
    fixture.detectChanges();

    expect(element.querySelector('[role="alert"]')).toBeNull();
    expect(element.querySelectorAll('app-service-event-card')).toHaveLength(2);
  });

  it('shows the ready empty state only after loading succeeds', () => {
    const fixture = TestBed.createComponent(Schedule);
    fixture.componentInstance.setStateForTest({ status: 'ready', page: page([]) });
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.textContent).toContain('No matching services');
    expect(element.querySelector('[role="status"]')).toBeNull();
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('keeps each card associated with its event when events are reordered', () => {
    const fixture = TestBed.createComponent(Schedule);
    fixture.componentInstance.setStateForTest({ status: 'ready', page: page([first, second]) });
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const cardsBefore = Array.from(element.querySelectorAll('app-service-event-card'));

    fixture.componentInstance.setStateForTest({ status: 'ready', page: page([second, first]) });
    fixture.detectChanges();
    const cardsAfter = Array.from(element.querySelectorAll('app-service-event-card'));

    expect(cardsAfter[0]).toBe(cardsBefore[1]);
    expect(cardsAfter[1]).toBe(cardsBefore[0]);
  });

  it('writes a ministry filter to the URL and resets the page', async () => {
    const router = TestBed.inject(Router);
    await router.navigate([], { queryParams: { month: '2026-11', page: 3 } });
    const fixture = TestBed.createComponent(Schedule);
    fixture.detectChanges();
    await fixture.whenStable();

    const select = fixture.nativeElement.querySelector('select') as HTMLSelectElement;
    select.value = 'technical';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(router.url).toContain('month=2026-11');
    expect(router.url).toContain('ministry=technical');
    expect(router.url).toContain('page=1');
  });

  it('lets an empty filtered view return to all ministries', async () => {
    const router = TestBed.inject(Router);
    await router.navigate([], {
      queryParams: { month: '2026-11', ministry: 'technical', page: 1 },
    });
    const fixture = TestBed.createComponent(Schedule);
    fixture.componentInstance.setStateForTest({ status: 'ready', page: page([]) });
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    const button = Array.from(buttons).find(
      (candidate) => candidate.textContent?.trim() === 'Show all ministries',
    );
    button?.click();
    await fixture.whenStable();

    expect(router.url).not.toContain('ministry=');
    expect(router.url).toContain('page=1');
  });
});
