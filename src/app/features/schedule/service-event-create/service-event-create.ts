import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CreateServiceEventCommand } from '../create-service-event-command';
import { ServiceEventForm } from '../service-event-form/service-event-form';
import { ServiceEventRepository } from '../service-event-repository';

@Component({
  selector: 'app-service-event-create',
  imports: [RouterLink, ServiceEventForm],
  templateUrl: './service-event-create.html',
  styleUrl: './service-event-create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceEventCreate {
  private readonly router = inject(Router);
  private readonly repository = inject(ServiceEventRepository);

  protected readonly saveError = signal('');

  protected createEvent(command: CreateServiceEventCommand): void {
    this.saveError.set('');
    try {
      const event = this.repository.create(command);
      void this.router.navigate(['/schedule', event.id]);
    } catch {
      this.saveError.set(
        'The event could not be saved in this browser. Check storage permissions and try again.',
      );
    }
  }
}
