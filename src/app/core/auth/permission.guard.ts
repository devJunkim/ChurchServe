import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map } from 'rxjs';
import { hasPermission, isPermission } from './current-user';
import { SessionStore } from './session-store';

export const permissionGuard: CanActivateFn = (route, state) => {
  const sessions = inject(SessionStore);
  const router = inject(Router);
  const requiredPermission = route.data['permission'];

  return sessions.ensureRestored().pipe(
    map((session) => {
      if (session.status !== 'authenticated') {
        return router.createUrlTree(['/sign-in'], {
          queryParams: { returnUrl: state.url },
        });
      }

      return isPermission(requiredPermission) && hasPermission(session.user, requiredPermission)
        ? true
        : router.createUrlTree(['/unavailable']);
    }),
  );
};
