import { focusFirstInvalidControl } from './focus-first-invalid-control';

describe('focusFirstInvalidControl', () => {
  it('focuses the first control exposed as invalid', () => {
    const root = document.createElement('form');
    root.innerHTML = `
      <input id="valid-control">
      <input id="first-invalid" aria-invalid="true">
      <input id="second-invalid" aria-invalid="true">
    `;
    document.body.append(root);

    focusFirstInvalidControl(root);

    expect(document.activeElement?.id).toBe('first-invalid');
    root.remove();
  });
});
