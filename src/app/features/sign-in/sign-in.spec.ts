import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { SessionStore } from '../../core/auth/session-store';
import { SignIn } from './sign-in';

describe('SignIn', () => {
  let store: { signIn: ReturnType<typeof vi.fn> };
  let returnUrl: string | null;

  beforeEach(() => {
    returnUrl = null;
    store = { signIn: vi.fn(() => of(undefined)) };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: SessionStore, useValue: store },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: { queryParamMap: { get: () => returnUrl } },
          },
        },
      ],
    });
  });

  it('submits credentials and clears the password after success', async () => {
    const fixture = TestBed.createComponent(SignIn);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();
    fixture.componentInstance['form'].controls.password.setValue('ChurchServeDemo!13');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(store.signIn).toHaveBeenCalledWith({
      email: 'coordinator@churchserve.local',
      password: 'ChurchServeDemo!13',
    });
    expect(fixture.componentInstance['form'].controls.password.value).toBe('');
    expect(navigate).toHaveBeenCalledWith('/schedule');
  });

  it('returns to the protected URL after successful sign-in', async () => {
    returnUrl = '/schedule/event-1';
    const fixture = TestBed.createComponent(SignIn);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();
    fixture.componentInstance['form'].controls.password.setValue('password');

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/schedule/event-1');
  });

  it('rejects an external return URL', async () => {
    returnUrl = '//example.com/steal-session';
    const fixture = TestBed.createComponent(SignIn);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl');
    fixture.detectChanges();
    fixture.componentInstance['form'].controls.password.setValue('password');

    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    expect(navigate).toHaveBeenCalledWith('/schedule');
  });

  it('shows invalid credentials without clearing the password as a fake success', () => {
    store.signIn.mockReturnValue(
      throwError(() => new HttpErrorResponse({ status: 401, statusText: 'Unauthorized' })),
    );
    const fixture = TestBed.createComponent(SignIn);
    fixture.detectChanges();
    fixture.componentInstance['form'].controls.password.setValue('wrong');
    fixture.nativeElement.querySelector('form').dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'incorrect',
    );
  });
});
