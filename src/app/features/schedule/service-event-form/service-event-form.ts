import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { CreateServiceEventCommand } from '../create-service-event-command';

@Component({
  selector: 'app-service-event-form',
  imports: [ReactiveFormsModule],
  templateUrl: './service-event-form.html',
  styleUrl: './service-event-form.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ServiceEventForm {
  private readonly formBuilder = inject(FormBuilder);

  readonly submitted = output<CreateServiceEventCommand>();

  protected readonly deviceTimeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'your device time zone';

  readonly form = this.formBuilder.nonNullable.group(
    {
      title: ['', [Validators.required, notBlank, Validators.maxLength(120)]],
      startsAt: ['', [Validators.required, validDateTime]],
      endsAt: ['', [Validators.required, validDateTime]],
      location: ['', [Validators.required, notBlank, Validators.maxLength(120)]],
    },
    { validators: [validTimeRange] },
  );

  applyServerErrors(fields: Readonly<Record<string, string>>): void {
    for (const [field, message] of Object.entries(fields)) {
      const control =
        field === 'title'
          ? this.form.controls.title
          : field === 'startsAt'
            ? this.form.controls.startsAt
            : field === 'endsAt'
              ? this.form.controls.endsAt
              : field === 'location'
                ? this.form.controls.location
                : undefined;

      if (control) {
        control.setErrors({ ...control.errors, server: message });
        control.markAsTouched();
      }
    }
  }

  submit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const value = this.form.getRawValue();
    this.submitted.emit({
      title: value.title.trim(),
      startsAt: new Date(value.startsAt).toISOString(),
      endsAt: new Date(value.endsAt).toISOString(),
      location: value.location.trim(),
    });
  }
}

export function validTimeRange(control: AbstractControl): ValidationErrors | null {
  const start = Date.parse(control.get('startsAt')?.value ?? '');
  const end = Date.parse(control.get('endsAt')?.value ?? '');

  if (Number.isNaN(start) || Number.isNaN(end)) {
    return null;
  }

  return end > start ? null : { timeRange: true };
}

function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  if (control.value.length === 0) {
    return null;
  }

  return /\S/.test(control.value) ? null : { blank: true };
}

function validDateTime(control: AbstractControl<string>): ValidationErrors | null {
  if (control.value.length === 0) {
    return null;
  }

  return Number.isNaN(Date.parse(control.value)) ? { dateTime: true } : null;
}
