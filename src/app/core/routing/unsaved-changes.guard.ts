import { inject, Injectable } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';

export interface DirtyAware {
  hasUnsavedChanges(): boolean;
}

@Injectable({ providedIn: 'root' })
export class UnsavedChangesPrompt {
  confirmDiscard(): boolean {
    return globalThis.confirm('Discard the unsaved service event?');
  }
}

export const unsavedChangesGuard: CanDeactivateFn<DirtyAware> = (component) =>
  !component.hasUnsavedChanges() || inject(UnsavedChangesPrompt).confirmDiscard();
