import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextEmptyStateId = 0;

@Component({
  selector: 'app-empty-state',
  templateUrl: './empty-state.html',
  styleUrl: './empty-state.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyState {
  readonly tone = input<'neutral' | 'warning'>('neutral');
  protected readonly headingId = `empty-state-heading-${nextEmptyStateId++}`;
}
