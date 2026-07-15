import { test, expect } from '@playwright/test';
import { login, spaNavigate } from '../fixtures/auth';
import { testUsers } from '../fixtures/users';

// Fluxo 13 — gestão de utilizador. Atribui uma função adicional a um utilizador mock
// existente (Sofia Ramos, só `SUPPORT_AGENT`) e confirma que a UI reflete de imediato.
test('fluxo 13: gestão de utilizador', async ({ page }) => {
  await login(page, testUsers.admin);
  await spaNavigate(page, '/administracao');
  await page.waitForLoadState('networkidle');

  await page
    .getByRole('button', { name: `Editar funções de ${testUsers.secondSupportAgent.name}` })
    .click();
  await expect(page.locator('.fdr-dialog')).toBeVisible();

  await page.getByRole('checkbox', { name: 'Editor de conteúdos' }).check();
  await page.getByRole('button', { name: 'Guardar' }).click();

  await expect(page.locator('.fdr-dialog')).toHaveCount(0);
  const row = page.locator('tr', { hasText: testUsers.secondSupportAgent.name });
  await expect(row.getByText('Editor de conteúdos')).toBeVisible();
});
