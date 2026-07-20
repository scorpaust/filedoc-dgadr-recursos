import { test, expect } from '@playwright/test';
import { login, spaNavigate } from '../fixtures/auth';
import { testUsers } from '../fixtures/users';
import { sampleGuideResourceSlug, sampleVideoResourceSlug } from '../fixtures/routes';

// Fluxo 4 — abertura de vídeo.
test('fluxo 4: abertura de vídeo', async ({ page }) => {
  await login(page, testUsers.employee);
  await spaNavigate(page, `/recursos/${sampleVideoResourceSlug}`);
  await page.waitForLoadState('networkidle');

  const video = page.locator('video');
  await expect(video).toBeVisible();
  await expect(video.locator('source')).toHaveAttribute('src', /resource-demo\.mp4/);
  await expect(video).not.toHaveAttribute('autoplay', '');
  expect(await video.evaluate((el: HTMLVideoElement) => el.paused)).toBe(true);
  await expect(page.getByRole('button', { name: 'Pedir suporte sobre este tema' })).toBeVisible();
});

// Fluxo 5 — abertura de PDF.
test('fluxo 5: abertura de PDF', async ({ page }) => {
  await login(page, testUsers.employee);
  await spaNavigate(page, `/recursos/${sampleGuideResourceSlug}`);
  await page.waitForLoadState('networkidle');

  const pdfFrame = page.locator('iframe[title]');
  await expect(pdfFrame).toBeVisible();
  await expect(page.getByRole('link', { name: /Descarregar PDF/ })).toBeVisible();
});
