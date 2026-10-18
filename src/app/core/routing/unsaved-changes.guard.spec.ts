import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { vi } from 'vitest';
import {
  DirtyAware,
  unsavedChangesGuard,
  UnsavedChangesPrompt,
} from './unsaved-changes.guard';

describe('unsavedChangesGuard', () => {
  const route = {} as ActivatedRouteSnapshot;
  const state = {} as RouterStateSnapshot;
  let prompt: { confirmDiscard: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    prompt = { confirmDiscard: vi.fn(() => false) };
    TestBed.configureTestingModule({
      providers: [{ provide: UnsavedChangesPrompt, useValue: prompt }],
    });
  });

  function run(component: DirtyAware): boolean {
    return TestBed.runInInjectionContext(
      () => unsavedChangesGuard(component, route, state, state) as boolean,
    );
  }

  it('leaves a pristine form without prompting', () => {
    expect(run({ hasUnsavedChanges: () => false })).toBe(true);
    expect(prompt.confirmDiscard).not.toHaveBeenCalled();
  });

  it('stays when discarding a dirty form is declined', () => {
    expect(run({ hasUnsavedChanges: () => true })).toBe(false);
    expect(prompt.confirmDiscard).toHaveBeenCalledOnce();
  });

  it('leaves when discarding a dirty form is confirmed', () => {
    prompt.confirmDiscard.mockReturnValue(true);

    expect(run({ hasUnsavedChanges: () => true })).toBe(true);
  });
});
