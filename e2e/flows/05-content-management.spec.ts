import { test, expect } from '@playwright/test';
import { login, spaNavigate } from '../fixtures/auth';
import { testUsers } from '../fixtures/users';
import { draftGuideResourceId } from '../fixtures/routes';

// Fluxo 12 — publicação de recurso. `res-3` é um rascunho com o ficheiro PDF principal já
// definido nos dados mock (`shared/mocks/resources.mock.ts`), pelo que "Publicar" não
// depende de um carregamento de ficheiro real neste fluxo mínimo.
test('fluxo 12: publicação de recurso', async ({ page }) => {
  await login(page, testUsers.contentEditorAndAdmin);
  await spaNavigate(page, `/conteudos/recursos/${draftGuideResourceId}/editar`);
  await page.waitForLoadState('networkidle');

  await expect(page.locator('#resource-title')).toHaveValue('Corrigir metadados de um ofício');
  await page.getByRole('button', { name: 'Publicar' }).click();

  await expect(page).toHaveURL(/\/conteudos$/);
  await page.locator('#resource-search').fill('Corrigir metadados de um ofício');
  await expect(page.getByText('Publicado').first()).toBeVisible();
});
