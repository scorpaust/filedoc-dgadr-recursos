import { test, expect } from '@playwright/test';
import { login, spaNavigate } from '../fixtures/auth';
import { testUsers } from '../fixtures/users';
import { employeeOpenTicketId, employeeWaitingTicketId } from '../fixtures/routes';

// Fluxo 6 — criação de ticket.
test('fluxo 6: criação de ticket', async ({ page }) => {
  await login(page, testUsers.employee);
  await spaNavigate(page, '/suporte/novo');
  await page.waitForLoadState('networkidle');

  await page.locator('#ticket-subject').fill('Não consigo abrir um guia em PDF');
  await page.locator('#ticket-description').fill('O ficheiro fica sempre em branco ao carregar.');
  await page.locator('#ticket-category').selectOption('Erro técnico');
  await page.locator('#ticket-priority').selectOption('normal');
  await page.getByRole('button', { name: 'Criar pedido' }).click();

  await expect(page).toHaveURL(/\/suporte\/sup-\d+$/);
  await expect(page.getByText('Não consigo abrir um guia em PDF')).toBeVisible();
  await expect(page.locator('.fdr-carimbo')).toContainText('SUP-');
});

// Fluxo 7 — consulta do ticket.
test('fluxo 7: consulta do ticket', async ({ page }) => {
  await login(page, testUsers.employee);
  await spaNavigate(page, '/suporte');
  await page.waitForLoadState('networkidle');
  await page.getByText('Não consigo aceder ao Filedoc').click();

  await expect(page).toHaveURL(new RegExp(`/suporte/${employeeOpenTicketId}$`));
  await expect(page.locator('h1')).toHaveText('Não consigo aceder ao Filedoc');
  await expect(page.locator('.fdr-ticket-timeline')).toBeVisible();
});

// Fluxo 8 — resposta do trabalhador.
test('fluxo 8: resposta do trabalhador', async ({ page }) => {
  await login(page, testUsers.employee);
  await spaNavigate(page, `/suporte/${employeeWaitingTicketId}`);
  await page.waitForLoadState('networkidle');

  const reply = 'O número do processo é 2026/1180 e o arquivo terá sido em março.';
  await page.locator('#reply-content').fill(reply);
  await page.getByRole('button', { name: 'Enviar resposta' }).click();

  await expect(page.getByText(reply)).toBeVisible();
});
