import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SessionStore } from './core/auth/session-store';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: SessionStore,
          useValue: {
            session: signal({
              status: 'authenticated',
              user: {
                id: 'coordinator-1',
                email: 'coordinator@churchserve.local',
                displayName: 'Demo Coordinator',
                roles: ['scheduler'],
              },
            }),
            signOut: () => of(undefined),
          },
        },
      ],
    }).compileComponents();
  });

  it('displays the application name and primary navigation', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelector('.brand')?.textContent).toContain('ChurchServe');
    expect(element.querySelector('nav')?.getAttribute('aria-label')).toBe('Primary navigation');
    expect(element.querySelectorAll('nav a').length).toBe(2);
  });

  it('provides a skip link to the main content', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector('.skip-link');
    expect(link?.getAttribute('href')).toBe('#main-content');
  });
});
import { signal } from '@angular/core';
