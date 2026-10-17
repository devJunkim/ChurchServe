import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
  private readonly destroyRef = inject(DestroyRef);

  protected readonly saveError = signal('');

  protected createEvent(command: CreateServiceEventCommand): void {
    this.saveError.set('');
    this.repository
      .create(command)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => void this.router.navigate(['/schedule', event.id]),
        error: () =>
          this.saveError.set(
            'The event could not be created. Check your connection and try again.',
          ),
      });
  }
}
