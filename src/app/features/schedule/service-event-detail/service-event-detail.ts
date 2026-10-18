import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { ServiceEvent } from '../service-event';

@Component({
  selector: 'app-service-event-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './service-event-detail.html',
  styleUrl: './service-event-detail.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceEventDetail {
  private readonly route = inject(ActivatedRoute);

  protected readonly event = toSignal(
    this.route.data.pipe(map((data) => data['serviceEvent'] as ServiceEvent)),
    { initialValue: this.route.snapshot.data['serviceEvent'] as ServiceEvent },
  );

  protected readonly openPositions = computed(() => {
    const event = this.event();
    return Math.max(0, event.requiredPositions - event.assignedPositions);
  });
}
