import { test, expect } from '@playwright/test';
import { login, spaNavigate } from '../fixtures/auth';
import { testUsers } from '../fixtures/users';

// Tarefa B de `fase-11-ui-acessibilidade-e2e.md` — navegação por teclado. Cobre os
// mecanismos partilhados por toda a aplicação (link "saltar para o conteúdo", diálogos,
// gaveta de navegação, dropdown de filtro, acordeão) — corrigidos uma única vez no
// componente partilhado quando encontrados, nunca ecrã a ecrã (risco em aberto da fase).
test.describe('Navegação por teclado', () => {
  test('link "saltar para o conteúdo" é o primeiro elemento focável e move o foco para o conteúdo principal', async ({
    page,
  }) => {
    await login(page, testUsers.employee);

    const firstFocusable = await page.evaluate(() => {
      const candidates = Array.from(
        document.querySelectorAll<HTMLElement>(
          'a[href], button, input, select, textarea, [tabindex]',
        ),
      ).filter((el) => el.tabIndex >= 0 && el.offsetParent !== null);
      return candidates[0]?.className ?? '';
    });
    expect(firstFocusable).toContain('fdr-skip-link');

    // O link só é visível quando focado (padrão "skip link"); .click() falharia por estar
    // fora da área visível — ativação real é sempre por teclado, a partir do topo da página
    // (Tab real, não .focus() programático, para replicar fielmente um utilizador real).
    await page.evaluate(() => document.body.focus());
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toHaveClass(/fdr-skip-link/);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => document.activeElement?.id === 'fdr-main-content');
  });

  test('nenhum elemento usa tabindex positivo (ordem de tabulação nunca reescrita manualmente)', async ({
    page,
  }) => {
    await login(page, testUsers.employee);
    await spaNavigate(page, '/recursos');
    await page.waitForLoadState('networkidle');

    const positiveTabIndexCount = await page.evaluate(
      () => document.querySelectorAll('[tabindex]:not([tabindex="-1"]):not([tabindex="0"])').length,
    );
    expect(positiveTabIndexCount).toBe(0);
  });

  test('gaveta de navegação móvel: Escape fecha e devolve o foco ao botão que a abriu', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await login(page, testUsers.employee);

    const menuToggle = page.getByRole('button', { name: 'Abrir navegação' });
    await menuToggle.focus();
    await menuToggle.press('Enter');
    await expect(page.locator('.fdr-app-shell__nav--open')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.fdr-app-shell__nav--open')).toHaveCount(0);
    await expect(menuToggle).toBeFocused();
  });

  test('dropdown de filtro (catálogo): Enter abre, Escape fecha', async ({ page }) => {
    await login(page, testUsers.employee);
    await spaNavigate(page, '/recursos');
    await page.waitForLoadState('networkidle');

    const trigger = page.getByRole('button', { name: 'Fluxo' });
    await trigger.focus();
    await trigger.press('Enter');
    await expect(page.locator('.fdr-dropdown-filter__panel')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.locator('.fdr-dropdown-filter__panel')).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('acordeão de FAQ: Enter/Espaço alternam aria-expanded', async ({ page }) => {
    await login(page, testUsers.employee);
    await spaNavigate(page, '/dicas-faq');
    await page.waitForLoadState('networkidle');

    const firstQuestion = page.locator('.fdr-accordion-item__trigger').first();
    await firstQuestion.focus();
    await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');

    await firstQuestion.press('Enter');
    await expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');

    await firstQuestion.press(' ');
    await expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  });

  test('diálogo de confirmação: foco fica contido e Escape devolve o foco ao botão que o abriu', async ({
    page,
  }) => {
    await login(page, testUsers.contentEditorAndAdmin);
    await spaNavigate(page, '/conteudos');
    await page.waitForLoadState('networkidle');

    const archiveButton = page.getByRole('button', { name: /^Arquivar/ }).first();
    await archiveButton.scrollIntoViewIfNeeded();
    await archiveButton.focus();
    await archiveButton.press('Enter');

    const dialog = page.locator('.fdr-dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(':focus')).toHaveCount(1);

    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await expect(archiveButton).toBeFocused();
  });
});
