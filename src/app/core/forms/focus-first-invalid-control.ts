export function focusFirstInvalidControl(root: HTMLElement): void {
  root.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
}
