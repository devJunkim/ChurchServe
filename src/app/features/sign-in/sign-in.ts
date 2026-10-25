import { ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SessionStore } from '../../core/auth/session-store';
import { safeReturnUrl } from '../../core/routing/safe-return-url';
import { toAppProblem } from '../../core/http/app-problem';
import { focusFirstInvalidControl } from '../../core/forms/focus-first-invalid-control';

@Component({
  selector: 'app-sign-in',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './sign-in.html',
  styleUrl: './sign-in.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SignIn {
  private readonly sessionStore = inject(SessionStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly form = new FormGroup({
    email: new FormControl('coordinator@churchserve.local', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected signIn(): void {
    if (this.isSubmitting()) {
      return;
    }

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.host.nativeElement.ownerDocument.defaultView?.setTimeout(() =>
        focusFirstInvalidControl(this.host.nativeElement),
      );
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set('');
    this.sessionStore.signIn(this.form.getRawValue()).subscribe({
      next: () => {
        this.form.controls.password.reset();
        void this.router.navigateByUrl(
          safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
        );
      },
      error: (error: unknown) => {
        this.isSubmitting.set(false);
        const problem = toAppProblem(error);
        this.errorMessage.set(
          problem.kind === 'unauthenticated'
            ? 'The email or password was incorrect.'
            : problem.kind === 'validation'
              ? 'Enter a valid email and password.'
              : 'Sign-in is unavailable. Try again.',
        );
      },
    });
  }
}
