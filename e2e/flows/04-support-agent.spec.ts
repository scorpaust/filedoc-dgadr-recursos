import { test, expect } from '@playwright/test';
import { login, spaNavigate } from '../fixtures/auth';
import { testUsers } from '../fixtures/users';
import { employeeOpenTicketId } from '../fixtures/routes';

async function openTicketInManagement(
  page: import('@playwright/test').Page,
  ticketId: string,
): Promise<void> {
  await login(page, testUsers.supportAgent);
  await spaNavigate(page, '/suporte/gestao');
  await page.waitForLoadState('networkidle');
  await page
    .locator('.fdr-support-management__queue-item', { hasText: 'Não consigo aceder ao Filedoc' })
    .click();
  await expect(page.locator('.fdr-support-management__subject')).toHaveText(
    'Não consigo aceder ao Filedoc',
  );
  void ticketId;
}

// Fluxo 9 — resposta do agente.
test('fluxo 9: resposta do agente', async ({ page }) => {
  await openTicketInManagement(page, employeeOpenTicketId);

  const reply = 'Vamos verificar o seu acesso e voltamos a contactá-la ainda hoje.';
  await page.locator('#reply-content').fill(reply);
  await page.getByRole('button', { name: 'Enviar resposta' }).click();

  await expect(page.getByText(reply)).toBeVisible();
});

// Fluxo 10 — nota interna.
test('fluxo 10: nota interna', async ({ page }) => {
  await openTicketInManagement(page, employeeOpenTicketId);

  await page.getByRole('radio', { name: 'Nota interna' }).check();
  const note = 'Verificado no diretório: a conta estava temporariamente bloqueada.';
  await page.locator('#reply-content').fill(note);
  await page.getByRole('button', { name: 'Guardar nota interna' }).click();

  await expect(page.getByText(note)).toBeVisible();
  await expect(page.locator('.fdr-tag--tone-warning', { hasText: 'Nota interna' })).toBeVisible();
});

// Fluxo 11 — resolução.
test('fluxo 11: resolução', async ({ page }) => {
  await openTicketInManagement(page, employeeOpenTicketId);

  await page.getByRole('button', { name: 'Marcar resolvido' }).click();
  await expect(page.locator('#ticket-status')).toHaveValue('RESOLVED');
  await expect(page.getByRole('button', { name: 'Marcar resolvido' })).toHaveCount(0);
});
