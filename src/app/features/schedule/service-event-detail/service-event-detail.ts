import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ServiceEventStore } from '../service-event-store';

@Component({
  selector: 'app-service-event-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './service-event-detail.html',
  styleUrl: './service-event-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceEventDetail {
  private readonly route = inject(ActivatedRoute);
  private readonly store = inject(ServiceEventStore);

  private readonly eventId = toSignal(
    this.route.paramMap.pipe(map((params) => params.get('eventId'))),
    { initialValue: this.route.snapshot.paramMap.get('eventId') },
  );

  protected readonly event = computed(() => {
    const id = this.eventId();
    return id ? this.store.findById(id) : undefined;
  });

  protected readonly openPositions = computed(() => {
    const event = this.event();
    return event ? Math.max(0, event.requiredPositions - event.assignedPositions) : 0;
  });
}
