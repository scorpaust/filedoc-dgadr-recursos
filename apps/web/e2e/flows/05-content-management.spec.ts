import { test, expect } from '@playwright/test';
import { login, spaNavigate } from '../fixtures/auth';
import { testUsers } from '../fixtures/users';

const DRAFT_GUIDE_TITLE = 'Corrigir metadados de um ofício';

// Fluxo 12 — publicação de recurso. Abre o recurso a partir da lista de gestão, pesquisando
// pelo título (dado estável do seed), nunca por um id fixo — o `id` real é gerado pela base
// de dados (cuid), não determinístico entre execuções (mesmo padrão já usado nos fluxos 7/8
// de `03-support-employee.spec.ts`, Fase 6). O recurso de seed já tem o ficheiro PDF
// principal e a miniatura (com texto alternativo) definidos, pelo que "Publicar" não depende
// de um carregamento de ficheiro real neste fluxo mínimo.
test('fluxo 12: publicação de recurso', async ({ page }) => {
  await login(page, testUsers.contentEditorAndAdmin);
  await spaNavigate(page, '/conteudos');

  await page.locator('#resource-search').fill(DRAFT_GUIDE_TITLE);
  const editLink = page.getByRole('link', { name: `Editar ${DRAFT_GUIDE_TITLE}` });
  await expect(editLink).toBeVisible();
  await editLink.click();

  await expect(page.locator('#resource-title')).toHaveValue(DRAFT_GUIDE_TITLE);
  await page.getByRole('button', { name: 'Publicar' }).click();

  await expect(page).toHaveURL(/\/conteudos$/);
  await page.locator('#resource-search').fill(DRAFT_GUIDE_TITLE);
  await expect(page.getByText('Publicado').first()).toBeVisible();
});
