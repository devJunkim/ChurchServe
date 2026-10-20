import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SessionStore } from './core/auth/session-store';
import { App } from './app';
import { SessionState } from './core/auth/session-store';

describe('App', () => {
  const session = signal<SessionState>({
    status: 'authenticated',
    user: {
      id: 'coordinator-1',
      email: 'coordinator@churchserve.local',
      displayName: 'Demo Coordinator',
      roles: ['scheduler'],
      permissions: ['schedule.read', 'schedule.manage', 'volunteer.read', 'volunteer.manage'],
    },
  });

  beforeEach(async () => {
    session.set({
      status: 'authenticated',
      user: {
        id: 'coordinator-1',
        email: 'coordinator@churchserve.local',
        displayName: 'Demo Coordinator',
        roles: ['scheduler'],
        permissions: ['schedule.read', 'schedule.manage', 'volunteer.read', 'volunteer.manage'],
      },
    });
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter([]),
        {
          provide: SessionStore,
          useValue: {
            session: session.asReadonly(),
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

  it('hides volunteer navigation without volunteer.read permission', () => {
    session.set({
      status: 'authenticated',
      user: {
        id: 'limited-1',
        email: 'limited@churchserve.local',
        displayName: 'Limited User',
        roles: ['limited'],
        permissions: ['schedule.read'],
      },
    });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelectorAll('nav a')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).not.toContain('Volunteers');
  });
});
