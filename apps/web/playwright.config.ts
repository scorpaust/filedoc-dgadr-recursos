import { defineConfig, devices } from '@playwright/test';

// Fase 11 (UI) — suite E2E corre contra uma build de produção servida localmente
// (`ng serve --configuration production`), mais fiel ao comportamento final do que o modo
// de desenvolvimento, conforme o risco em aberto de `fase-11-ui-acessibilidade-e2e.md`.
const PORT = 4310;
const BASE_URL = `http://localhost:${PORT}`;

// Desde a Fase 1 (Integração), o login é real: `apiUrlInterceptor` já prefixa os pedidos
// com `AppConfigService.apiUrl` (por omissão `http://localhost:3000/api/v1`, ver
// app-config.service.ts) e envia-os com `withCredentials: true`. A API tem de estar a
// correr em localhost:3000 antes desta suite (tanto localmente como no job `e2e` do CI),
// com `CORS_ALLOWED_ORIGINS` a incluir `http://localhost:4310`, para o cookie de sessão
// HttpOnly cross-origin ser aceite pelo browser.

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx ng serve --configuration production --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
