import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  HostListener,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DirtyAware } from '../../../core/routing/unsaved-changes.guard';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { CreateServiceEventCommand } from '../create-service-event-command';
import { ServiceEventForm } from '../service-event-form/service-event-form';
import { ScheduleStore } from '../schedule-store';
import { toAppProblem, unexpectedProblemMessage } from '../../../core/http/app-problem';

@Component({
  selector: 'app-service-event-create',
  imports: [RouterLink, ServiceEventForm],
  templateUrl: './service-event-create.html',
  styleUrl: './service-event-create.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceEventCreate implements DirtyAware {
  private readonly router = inject(Router);
  private readonly store = inject(ScheduleStore);
  private readonly destroyRef = inject(DestroyRef);
  private readonly eventForm = viewChild(ServiceEventForm);

  protected readonly saveError = signal('');

  hasUnsavedChanges(): boolean {
    return this.eventForm()?.form.dirty ?? false;
  }

  @HostListener('window:beforeunload', ['$event'])
  protected preventBrowserUnload(event: BeforeUnloadEvent): void {
    if (this.hasUnsavedChanges()) {
      event.preventDefault();
      event.returnValue = '';
    }
  }

  protected createEvent(command: CreateServiceEventCommand): void {
    this.saveError.set('');
    this.store
      .create(command)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (event) => {
          this.eventForm()?.form.markAsPristine();
          void this.router.navigate(['/schedule', event.id]);
        },
        error: (error: unknown) => {
          const problem = toAppProblem(error);
          if (problem.kind === 'validation' && Object.keys(problem.fields).length > 0) {
            this.eventForm()?.applyServerErrors(problem.fields);
            this.saveError.set('Review the highlighted fields and try again.');
            return;
          }

          this.saveError.set(createEventMessage(problem));
        },
      });
  }
}

function createEventMessage(problem: ReturnType<typeof toAppProblem>): string {
  switch (problem.kind) {
    case 'unauthenticated':
      return 'Your session expired. Sign in again before creating this event.';
    case 'forbidden':
      return 'Your account does not have permission to create service events.';
    case 'conflict':
      return 'The schedule changed while you were editing. Review it and try again.';
    case 'unavailable':
      return 'The event was not saved because the service is unavailable. Your entries are still here.';
    default:
      return unexpectedProblemMessage(problem, 'The event could not be created. Try again.');
  }
}
