import { test, expect, Page } from '@playwright/test';
import { login, spaNavigate } from '../fixtures/auth';
import { testUsers } from '../fixtures/users';
import { sampleGuideResourceSlug, sampleVideoResourceSlug } from '../fixtures/routes';

// Tarefa C de `fase-11-ui-acessibilidade-e2e.md` — as 5 larguras de referência de
// `project-spec.md`. Verifica ausência de deslocamento horizontal indevido (mesma técnica
// `scrollWidth`/`innerWidth` já usada nas validações manuais das Fases 3–10).
const REFERENCE_WIDTHS = [320, 375, 768, 1024, 1440] as const;

async function expectNoHorizontalOverflow(page: Page, context: string): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(
    scrollWidth,
    `${context}: scrollWidth (${scrollWidth}) > innerWidth (${innerWidth})`,
  ).toBeLessThanOrEqual(innerWidth);
}

test.describe('Auditoria responsiva — 5 larguras de referência', () => {
  test('EMPLOYEE: ecrãs de recursos, dicas/FAQ e suporte', async ({ page }) => {
    await login(page, testUsers.employee);
    const routes = [
      '/inicio',
      '/recursos',
      `/recursos/${sampleVideoResourceSlug}`,
      `/recursos/${sampleGuideResourceSlug}`,
      '/dicas-faq',
      '/suporte',
      '/suporte/novo',
    ];
    for (const width of REFERENCE_WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of routes) {
        await spaNavigate(page, route);
        await page.waitForLoadState('networkidle');
        await expectNoHorizontalOverflow(page, `${route} @ ${width}px`);
      }
    }
  });

  test('SUPPORT_AGENT: painel lista+detalhe da gestão de suporte', async ({ page }) => {
    await login(page, testUsers.supportAgent);
    for (const width of REFERENCE_WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await spaNavigate(page, '/suporte/gestao');
      await page.waitForLoadState('networkidle');
      await expectNoHorizontalOverflow(page, `/suporte/gestao @ ${width}px`);
    }
  });

  test('CONTENT_EDITOR+ADMIN: tabela de conteúdos e administração', async ({ page }) => {
    await login(page, testUsers.contentEditorAndAdmin);
    for (const width of REFERENCE_WIDTHS) {
      await page.setViewportSize({ width, height: 900 });
      await spaNavigate(page, '/conteudos');
      await page.waitForLoadState('networkidle');
      await expectNoHorizontalOverflow(page, `/conteudos @ ${width}px`);

      await spaNavigate(page, '/administracao');
      await page.waitForLoadState('networkidle');
      await expectNoHorizontalOverflow(page, `/administracao @ ${width}px`);
    }
  });

  test('gaveta de navegação móvel funciona em todos os ecrãs a 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await login(page, testUsers.employee);

    for (const route of ['/inicio', '/recursos', '/dicas-faq', '/suporte']) {
      await spaNavigate(page, route);
      await page.waitForLoadState('networkidle');
      const toggle = page.getByRole('button', { name: 'Abrir navegação' });
      await toggle.click();
      await expect(page.locator('.fdr-app-shell__nav--open')).toBeVisible();
      // A gaveta (16rem/256px) só cobre a parte esquerda do ecrã a 375px — clicamos no
      // resguardo ("scrim") fora dessa área, tal como um utilizador real faria.
      await page
        .getByRole('button', { name: 'Fechar navegação' })
        .click({ position: { x: 360, y: 50 } });
      await expect(page.locator('.fdr-app-shell__nav--open')).toHaveCount(0);
    }
  });
});
