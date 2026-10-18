import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ScheduleStore } from '../schedule-store';
import { ServiceEvent } from '../service-event';

export const serviceEventResolver: ResolveFn<ServiceEvent | RedirectCommand> = (route, state) => {
  const store = inject(ScheduleStore);
  const router = inject(Router);
  const id = route.paramMap.get('eventId');

  if (!id) {
    return new RedirectCommand(router.parseUrl('/not-found'));
  }

  return store.findById(id).pipe(
    map((event) => event ?? new RedirectCommand(router.parseUrl('/not-found'))),
    catchError(() =>
      of(
        new RedirectCommand(
          router.createUrlTree(['/unavailable'], {
            queryParams: { returnUrl: state.url },
          }),
        ),
      ),
    ),
  );
};
