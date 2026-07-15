import { Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import type { Result } from 'axe-core';

// Tarefa A de `fase-11-ui-acessibilidade-e2e.md`: zero violações críticas ou sérias por
// rota; violações menores ficam documentadas fora desta suite (não bloqueiam o CI).
const BLOCKING_IMPACTS = new Set(['critical', 'serious']);

export async function scanForBlockingViolations(page: Page): Promise<Result[]> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();
  return results.violations.filter((violation) => BLOCKING_IMPACTS.has(violation.impact ?? ''));
}

export function formatViolations(violations: readonly Result[]): string {
  if (violations.length === 0) {
    return 'sem violações';
  }
  return violations
    .map((violation) => {
      const targets = violation.nodes.map((node) => node.target.join(' ')).join(', ');
      return `[${violation.impact}] ${violation.id} — ${violation.help} (${targets})`;
    })
    .join('\n');
}
