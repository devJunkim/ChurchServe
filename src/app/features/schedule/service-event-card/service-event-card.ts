import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ServiceEvent } from '../service-event';

@Component({
  selector: 'app-service-event-card',
  imports: [DatePipe, RouterLink],
  templateUrl: './service-event-card.html',
  styleUrl: './service-event-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceEventCard {
  readonly event = input.required<ServiceEvent>();

  protected readonly openPositions = computed(() =>
    Math.max(0, this.event().requiredPositions - this.event().assignedPositions),
  );
}
