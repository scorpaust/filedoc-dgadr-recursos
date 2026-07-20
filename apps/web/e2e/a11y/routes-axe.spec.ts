import { test, expect } from '@playwright/test';
import { formatViolations, scanForBlockingViolations } from '../fixtures/axe';
import { login, spaNavigate } from '../fixtures/auth';
import { roleAudienceForRoute, testUsers } from '../fixtures/users';
import {
  employeeOpenTicketId,
  sampleGuideResourceSlug,
  sampleVideoResourceSlug,
} from '../fixtures/routes';

// Tarefa A de `fase-11-ui-acessibilidade-e2e.md` — axe-core contra as rotas principais,
// para cada função simulada com acesso a essa rota. Zero violações críticas/sérias.
test.describe('Auditoria axe-core', () => {
  test('/login (não autenticado)', async ({ page }) => {
    await page.goto('/login');
    const violations = await scanForBlockingViolations(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  for (const [route, audience] of Object.entries(roleAudienceForRoute)) {
    for (const user of audience) {
      test(`${route} — ${user.roles.join('+')} (${user.name})`, async ({ page }) => {
        await login(page, user);
        if (route !== '/inicio') {
          await spaNavigate(page, route);
        }
        await page.waitForLoadState('networkidle');
        const violations = await scanForBlockingViolations(page);
        expect(violations, formatViolations(violations)).toEqual([]);
      });
    }
  }

  test('/recursos/:slug (vídeo) — EMPLOYEE', async ({ page }) => {
    await login(page, testUsers.employee);
    await spaNavigate(page, `/recursos/${sampleVideoResourceSlug}`);
    await page.waitForLoadState('networkidle');
    const violations = await scanForBlockingViolations(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('/recursos/:slug (guia) — EMPLOYEE', async ({ page }) => {
    await login(page, testUsers.employee);
    await spaNavigate(page, `/recursos/${sampleGuideResourceSlug}`);
    await page.waitForLoadState('networkidle');
    const violations = await scanForBlockingViolations(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('/suporte/:id — EMPLOYEE', async ({ page }) => {
    await login(page, testUsers.employee);
    await spaNavigate(page, `/suporte/${employeeOpenTicketId}`);
    await page.waitForLoadState('networkidle');
    const violations = await scanForBlockingViolations(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('/acesso-negado — EMPLOYEE', async ({ page }) => {
    await login(page, testUsers.employee);
    await spaNavigate(page, '/acesso-negado');
    await page.waitForLoadState('networkidle');
    const violations = await scanForBlockingViolations(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });

  test('/** não encontrado — EMPLOYEE', async ({ page }) => {
    await login(page, testUsers.employee);
    await spaNavigate(page, '/uma-rota-que-nao-existe');
    await page.waitForLoadState('networkidle');
    const violations = await scanForBlockingViolations(page);
    expect(violations, formatViolations(violations)).toEqual([]);
  });
});
