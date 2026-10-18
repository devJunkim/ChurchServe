import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { SessionStore } from './session-store';

export const signedInGuard: CanActivateFn = (_route, state) => {
  const sessions = inject(SessionStore);
  const router = inject(Router);

  return sessions.ensureRestored().pipe(
    map((session) =>
      session.status === 'authenticated'
        ? true
        : router.createUrlTree(['/sign-in'], {
            queryParams: { returnUrl: state.url },
          }),
    ),
  );
};
