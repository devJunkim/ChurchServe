import { ChangeDetectionStrategy, Component, input } from '@angular/core';

let nextPanelId = 0;

@Component({
  selector: 'app-panel',
  templateUrl: './panel.html',
  styleUrl: './panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Panel {
  readonly tone = input<'default' | 'subtle'>('default');
  protected readonly headingId = `panel-heading-${nextPanelId++}`;
}
