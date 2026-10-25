import axe from 'axe-core';

export async function expectNoAccessibilityViolations(root: Element): Promise<void> {
  const result = await axe.run(root, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
    },
    rules: {
      // jsdom has no canvas implementation, so rendered color remains a browser/manual check.
      'color-contrast': { enabled: false },
      'link-in-text-block': { enabled: false },
    },
  });

  expect(result.violations, formatViolations(result.violations)).toEqual([]);
}

function formatViolations(violations: axe.Result[]): string {
  return violations
    .map(
      (violation) =>
        `${violation.id}: ${violation.help}\n${violation.nodes
          .map((node) => `  ${node.target.join(' ')}: ${node.failureSummary ?? ''}`)
          .join('\n')}`,
    )
    .join('\n\n');
}
