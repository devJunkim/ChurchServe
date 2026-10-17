import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { EmptyState } from './empty-state';

@Component({
  imports: [EmptyState],
  template: `
    <app-empty-state>
      <span empty-title>No matching services</span>
      <p>Try another ministry.</p>
      <button empty-actions type="button" (click)="clear()">Show all ministries</button>
    </app-empty-state>
  `,
})
class TestHost {
  readonly clear = vi.fn();
}

describe('EmptyState', () => {
  it('projects a labelled message and preserves the caller action', () => {
    const fixture = TestBed.createComponent(TestHost);
    fixture.detectChanges();
    const section = fixture.nativeElement.querySelector('section') as HTMLElement;

    expect(section.getAttribute('aria-labelledby')).toBe(section.querySelector('h2')?.id);
    expect(section.textContent).toContain('No matching services');
    expect(section.textContent).toContain('Try another ministry.');

    (section.querySelector('button') as HTMLButtonElement | null)?.click();
    expect(fixture.componentInstance.clear).toHaveBeenCalledOnce();
  });
});
