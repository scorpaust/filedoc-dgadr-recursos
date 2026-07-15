import { test, expect } from '@playwright/test';
import { login, logout } from '../fixtures/auth';
import { testUsers } from '../fixtures/users';

// Fluxo 1 — início de sessão (project-spec.md).
test('fluxo 1: início de sessão', async ({ page }) => {
  await login(page, testUsers.employee);
  await expect(page.getByRole('button', { name: /^Menu do utilizador/ })).toBeVisible();
  await expect(page.locator('h1')).toContainText('Domine o Filedoc');

  await logout(page);
  await expect(page.locator('#login-email')).toBeVisible();
});

// Fluxo 2 — pesquisa de recurso.
test('fluxo 2: pesquisa de recurso', async ({ page }) => {
  await login(page, testUsers.employee);
  await page.getByRole('button', { name: 'Ver recursos' }).click();
  await expect(page).toHaveURL(/\/recursos$/);

  await page.locator('#catalog-search').fill('despacho digitalmente');
  await expect(page).toHaveURL(/[?&]q=despacho/);
  await expect(page.getByText('Assinar um despacho digitalmente')).toBeVisible();
  await expect(page.locator('.fdr-resource-card')).toHaveCount(1);
});

// Fluxo 3 — aplicação de filtros.
test('fluxo 3: aplicação de filtros', async ({ page }) => {
  await login(page, testUsers.employee);
  await page.getByRole('button', { name: 'Ver recursos' }).click();
  await expect(page.locator('.fdr-resource-card').first()).toBeVisible();

  await page.getByRole('radio', { name: 'Vídeo' }).click();
  await expect(page).toHaveURL(/[?&]tipo=video/);

  const cardTypeBadges = page.locator('.fdr-resource-card__type-badge');
  await expect(cardTypeBadges.first()).toBeVisible();
  const count = await cardTypeBadges.count();
  for (let i = 0; i < count; i++) {
    await expect(cardTypeBadges.nth(i)).toHaveText('VÍDEO');
  }

  await page.getByRole('button', { name: 'Limpar filtros' }).click();
  await expect(page).not.toHaveURL(/[?&]tipo=video/);
});
