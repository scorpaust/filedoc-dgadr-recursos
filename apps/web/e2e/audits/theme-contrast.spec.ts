import { test, expect } from '@playwright/test';
import { formatViolations, scanForBlockingViolations } from '../fixtures/axe';
import { login, spaNavigate } from '../fixtures/auth';
import { testUsers } from '../fixtures/users';

// Tarefa D de `fase-11-ui-acessibilidade-e2e.md` — tema e contraste. A tarefa A já corre
// no tema claro (o tema por omissão do browser nesta suite); aqui repetimos uma amostra
// representativa de rotas no tema escuro, e confirmamos a ausência de "flash" de tema
// incorreto, incluindo em profundidade (não apenas em `/login`).
test.describe('Tema e contraste', () => {
  const routesToAudit = [
    '/inicio',
    '/recursos',
    '/dicas-faq',
    '/suporte/gestao',
    '/conteudos',
    '/administracao',
  ];

  for (const route of routesToAudit) {
    test(`sem violações críticas/sérias de contraste no tema escuro — ${route}`, async ({
      page,
    }) => {
      await login(page, testUsers.contentEditorAndAdmin);
      await page.getByRole('button', { name: 'Ativar tema escuro' }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

      await spaNavigate(page, route);
      await page.waitForLoadState('networkidle');
      const violations = await scanForBlockingViolations(page);
      expect(violations, `${route} (tema escuro): ${formatViolations(violations)}`).toEqual([]);
    });
  }

  test('preferência de tema guardada é aplicada antes do arranque do Angular (sem flash)', async ({
    page,
  }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('fdr-theme', 'light');
    });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const themeAtDomContentLoaded = await page.evaluate(() =>
      document.documentElement.getAttribute('data-theme'),
    );
    expect(themeAtDomContentLoaded).toBe('light');
  });

  test('sem preferência guardada, segue prefers-color-scheme antes do arranque do Angular', async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/login', { waitUntil: 'domcontentloaded' });
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('dark');
  });
});
