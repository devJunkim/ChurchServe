import { inject } from '@angular/core';
import { RedirectCommand, ResolveFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { ServiceEventRepository } from '../service-event-repository';
import { ServiceEvent } from '../service-event';

export const serviceEventResolver: ResolveFn<ServiceEvent | RedirectCommand> = (route, state) => {
  const repository = inject(ServiceEventRepository);
  const router = inject(Router);
  const id = route.paramMap.get('eventId');

  if (!id) {
    return new RedirectCommand(router.parseUrl('/not-found'));
  }

  return repository.findById(id).pipe(
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
