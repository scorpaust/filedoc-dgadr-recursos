import { test, expect } from '@playwright/test';
import { login, spaNavigate } from '../fixtures/auth';
import { testUsers } from '../fixtures/users';
import { otherUserTicketId } from '../fixtures/routes';

// Fluxo 14a — bloqueio de acesso indevido: EMPLOYEE a tentar aceder a `/administracao`.
test('fluxo 14a: EMPLOYEE é bloqueado ao aceder a /administracao', async ({ page }) => {
  await login(page, testUsers.employee);
  await spaNavigate(page, '/administracao');
  await page.waitForLoadState('networkidle');

  await expect(page).toHaveURL(/\/acesso-negado$/);
  await expect(page.getByText('Acesso não autorizado')).toBeVisible();
});

// Fluxo 14b — bloqueio de acesso indevido: um utilizador a tentar aceder ao pedido de
// outro. Nunca deve distinguir "não existe" de "pertence a outro utilizador".
test('fluxo 14b: utilizador não acede ao pedido de suporte de outro', async ({ page }) => {
  await login(page, testUsers.employee);
  await spaNavigate(page, `/suporte/${otherUserTicketId}`);
  await page.waitForLoadState('networkidle');

  await expect(page.getByText('Pedido não encontrado')).toBeVisible();
});
