import { test, expect } from '@playwright/test';
import { login, spaNavigate } from '../fixtures/auth';
import { testUsers } from '../fixtures/users';

// Desde a Fase 5 (Integração), os pedidos de suporte do trabalhador vêm da API real —
// o `id` interno é um cuid gerado pela base de dados (não o `sup-N` fixo do mock da via de
// UI, Fase 6), pelo que não pode ser conhecido antecipadamente. As asserções de URL abaixo
// confirmam apenas que a navegação saiu da lista/formulário para um detalhe real, sem fixar
// o valor exato do `id`; onde é preciso abrir um pedido específico, navega-se sempre a
// partir da lista, clicando pelo assunto (dado estável do seed), nunca por um `id` literal.
const DETAIL_URL_PATTERN = /\/suporte\/(?!novo$)[^/]+$/;

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

  await expect(page).toHaveURL(DETAIL_URL_PATTERN);
  await expect(page.getByText('Não consigo abrir um guia em PDF')).toBeVisible();
  await expect(page.locator('.fdr-carimbo')).toContainText('SUP-');
});

// Fluxo 7 — consulta do ticket.
test('fluxo 7: consulta do ticket', async ({ page }) => {
  await login(page, testUsers.employee);
  await spaNavigate(page, '/suporte');
  await page.waitForLoadState('networkidle');
  await page.getByText('Não consigo aceder ao Filedoc').click();

  await expect(page).toHaveURL(DETAIL_URL_PATTERN);
  await expect(page.locator('h1')).toHaveText('Não consigo aceder ao Filedoc');
  await expect(page.locator('.fdr-ticket-timeline')).toBeVisible();
});

// Fluxo 8 — resposta do trabalhador. Abre-se o pedido a partir da lista (não por um `id`
// direto, desconhecido antecipadamente) — "Preciso de confirmar um dado antes de
// continuar" é o pedido de seed de Marta Silva em estado WAITING_FOR_USER.
test('fluxo 8: resposta do trabalhador', async ({ page }) => {
  await login(page, testUsers.employee);
  await spaNavigate(page, '/suporte');
  await page.waitForLoadState('networkidle');
  await page.getByText('Preciso de confirmar um dado antes de continuar').click();
  await expect(page).toHaveURL(DETAIL_URL_PATTERN);

  const reply = 'O número do processo é 2026/1180 e o arquivo terá sido em março.';
  await page.locator('#reply-content').fill(reply);
  await page.getByRole('button', { name: 'Enviar resposta' }).click();

  await expect(page.getByText(reply)).toBeVisible();
});
