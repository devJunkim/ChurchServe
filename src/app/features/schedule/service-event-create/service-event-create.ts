import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CreateServiceEventCommand } from '../create-service-event-command';
import { ServiceEventForm } from '../service-event-form/service-event-form';
import { ServiceEventStore } from '../service-event-store';

@Component({
  selector: 'app-service-event-create',
  imports: [RouterLink, ServiceEventForm],
  templateUrl: './service-event-create.html',
  styleUrl: './service-event-create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceEventCreate {
  private readonly router = inject(Router);
  private readonly store = inject(ServiceEventStore);

  protected createEvent(command: CreateServiceEventCommand): void {
    const event = this.store.create(command);
    void this.router.navigate(['/schedule', event.id]);
  }
}
