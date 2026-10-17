import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, map, of, startWith, switchMap } from 'rxjs';
import { ServiceEventRepository } from '../service-event-repository';
import { ServiceEvent } from '../service-event';

export type ServiceEventDetailState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; event: ServiceEvent | undefined };

@Component({
  selector: 'app-service-event-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './service-event-detail.html',
  styleUrl: './service-event-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceEventDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly repository = inject(ServiceEventRepository);

  protected readonly state = toSignal(
    this.route.paramMap.pipe(
      map((params) => params.get('eventId')),
      switchMap((id) =>
        (id ? this.repository.findById(id) : of(undefined)).pipe(
          map((event): ServiceEventDetailState => ({
            status: 'ready',
            event,
          })),
          startWith<ServiceEventDetailState>({ status: 'loading' }),
          catchError(() =>
            of<ServiceEventDetailState>({
              status: 'error',
              message:
                'The service event could not be loaded. Check your connection and try again.',
            }),
          ),
        ),
      ),
    ),
    { initialValue: { status: 'loading' } as ServiceEventDetailState },
  );

  protected readonly event = computed(() => {
    const state = this.state();
    return state.status === 'ready' ? state.event : undefined;
  });

  protected readonly errorMessage = computed(() => {
    const state = this.state();
    return state.status === 'error' ? state.message : '';
  });

  protected readonly openPositions = computed(() => {
    const event = this.event();
    return event ? Math.max(0, event.requiredPositions - event.assignedPositions) : 0;
  });
}
