import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Panel } from './panel';

@Component({
  imports: [Panel],
  template: `
    <app-panel>
      <span panel-title>Open positions</span>
      <button panel-actions type="button">Assign</button>
      <p>Two positions remain.</p>
    </app-panel>
    <app-panel tone="subtle">
      <span panel-title>Filters</span>
      <p>Filter controls</p>
    </app-panel>
  `,
})
class TestHost {}

describe('Panel', () => {
  it('projects labelled headings, actions, and body content', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const panels = fixture.nativeElement.querySelectorAll('section') as NodeListOf<HTMLElement>;

    expect(panels[0].textContent).toContain('Open positions');
    expect(panels[0].textContent).toContain('Assign');
    expect(panels[0].textContent).toContain('Two positions remain.');
    expect(panels[0].getAttribute('aria-labelledby')).toBe(panels[0].querySelector('h2')?.id);
  });

  it('assigns unique heading IDs and supports the deliberate subtle tone', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const panels = fixture.nativeElement.querySelectorAll('section') as NodeListOf<HTMLElement>;

    expect(panels[0].getAttribute('aria-labelledby')).not.toBe(
      panels[1].getAttribute('aria-labelledby'),
    );
    expect(panels[1].classList).toContain('panel--subtle');
  });
});
