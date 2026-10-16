import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { ServiceEvent } from '../service-event';

@Component({
  selector: 'app-service-event-card',
  imports: [DatePipe],
  templateUrl: './service-event-card.html',
  styleUrl: './service-event-card.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceEventCard {
  readonly event = input.required<ServiceEvent>();
  readonly selected = output<string>();

  protected readonly openPositions = computed(() =>
    Math.max(0, this.event().requiredPositions - this.event().assignedPositions),
  );

  protected selectEvent(): void {
    this.selected.emit(this.event().id);
  }
}
