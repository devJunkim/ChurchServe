import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { AssignmentStore } from '../assignment-store';
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
  private readonly selectedVolunteerIds = signal<Readonly<Record<string, string>>>({});
  protected readonly assignmentStore = inject(AssignmentStore);

  protected readonly event = toSignal(
    this.route.data.pipe(map((data) => data['serviceEvent'] as ServiceEvent)),
    { initialValue: this.route.snapshot.data['serviceEvent'] as ServiceEvent },
  );

  protected readonly openPositions = computed(() => {
    const event = this.event();
    return Math.max(
      0,
      event.requiredPositions -
        (this.assignmentStore.assignedPositions() ?? event.assignedPositions),
    );
  });

  constructor() {
    this.assignmentStore.load(this.event().id);
  }

  protected selectedVolunteer(positionId: string): string {
    return this.selectedVolunteerIds()[positionId] ?? '';
  }

  protected selectVolunteer(positionId: string, event: Event): void {
    const volunteerId = (event.target as HTMLSelectElement).value;
    this.selectedVolunteerIds.update((current) => ({ ...current, [positionId]: volunteerId }));
  }

  protected assign(positionId: string): void {
    const volunteerId = this.selectedVolunteer(positionId);
    if (volunteerId) {
      this.assignmentStore.assign(positionId, volunteerId);
      this.selectedVolunteerIds.update((current) => ({ ...current, [positionId]: '' }));
    }
  }
}
