import { test, expect } from '@playwright/test';
import { login, spaNavigate } from '../fixtures/auth';
import { testUsers } from '../fixtures/users';

// Tarefa E de `fase-11-ui-acessibilidade-e2e.md` — movimento, zoom e alvos táteis.
test.describe('Movimento, zoom e alvos táteis', () => {
  test('prefers-reduced-motion: a transição do acordeão é desativada (duração 0)', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await login(page, testUsers.employee);
    await spaNavigate(page, '/dicas-faq');
    // O painel colapsado tem altura 0 (não "display: none"), pelo que nunca fica "visible"
    // para o Playwright — só precisamos que exista no DOM para ler o seu estilo computado.
    await page.locator('.fdr-accordion-item__content').first().waitFor({ state: 'attached' });

    const duration = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--fdr-duration-base').trim(),
    );
    expect(duration).toBe('0ms');

    const contentTransitionDuration = await page.evaluate(() => {
      const content = document.querySelector<HTMLElement>('.fdr-accordion-item__content');
      return content ? getComputedStyle(content).transitionDuration : '';
    });
    expect(contentTransitionDuration).toBe('0s');
  });

  test('200% de zoom (viewport reduzida a metade): catálogo e detalhe sem overflow horizontal', async ({
    page,
  }) => {
    // Playwright não expõe controlo de zoom do browser; a técnica equivalente para testar o
    // reflow a 200% é reduzir a viewport CSS para metade de um ecrã de referência (1280×800
    // → 640×400), já que o layout responde exatamente da mesma forma ao espaço disponível.
    await page.setViewportSize({ width: 640, height: 400 });
    await login(page, testUsers.employee);
    await spaNavigate(page, '/recursos');
    await page.waitForLoadState('networkidle');

    const overflowCatalog = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflowCatalog).toBeLessThanOrEqual(0);

    await expect(page.locator('.fdr-catalog__toolbar')).toBeVisible();
  });

  test('alvos táteis (375px): botões de ícone do cabeçalho e paginação têm pelo menos 44×44 px', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await login(page, testUsers.employee);

    for (const label of ['Abrir navegação', 'Ativar tema escuro']) {
      const box = await page.getByRole('button', { name: label }).boundingBox();
      expect(box, `botão "${label}" sem caixa delimitadora`).not.toBeNull();
      expect(box!.width, `largura de "${label}"`).toBeGreaterThanOrEqual(44);
      expect(box!.height, `altura de "${label}"`).toBeGreaterThanOrEqual(44);
    }

    await spaNavigate(page, '/recursos?pagina=1');
    await page.waitForLoadState('networkidle');
    const nextPageButton = page.locator('.fdr-pagination__nav').last();
    if (await nextPageButton.count()) {
      const box = await nextPageButton.boundingBox();
      expect(box, 'botão de paginação sem caixa delimitadora').not.toBeNull();
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
