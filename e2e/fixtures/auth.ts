import { Page, expect } from '@playwright/test';
import { E2eUser } from './users';

// Início de sessão real através do formulário de login (não a ferramenta de simulação de
// função), para que o fluxo 1 (`e2e/flows`) e a autenticação usada por todos os outros
// testes exerçam exatamente o mesmo caminho que um utilizador real percorre.
export async function login(page: Page, user: E2eUser): Promise<void> {
  if (!user.password) {
    throw new Error(`Utilizador sem credencial mock para login: ${user.email}`);
  }
  await page.goto('/login');
  await page.locator('#login-email').fill(user.email);
  await page.locator('#login-password').fill(user.password);
  await page.getByRole('button', { name: 'Iniciar sessão' }).click();
  await expect(page).toHaveURL(/\/inicio$/);
}

// A sessão simulada (Fase 2) só existe em memória — qualquer navegação de browser real
// (incluindo `page.goto`) recarrega o bundle e perde-a. Para nos mantermos dentro da SPA
// depois do login, tal como um utilizador clicando num link, disparamos nós próprios o
// `popstate` que o `Router` do Angular já escuta (mesma técnica usada nas validações
// manuais das Fases 3–10, aqui formalizada como um passo repetível da suite E2E).
export async function spaNavigate(page: Page, path: string): Promise<void> {
  await page.evaluate((targetPath) => {
    history.pushState(null, '', targetPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole('button', { name: /^Menu do utilizador/ }).click();
  // Os itens do menu têm role="menuitem" (não "button"), apesar de serem <button>.
  await page.getByRole('menuitem', { name: 'Terminar sessão' }).click();
  await expect(page).toHaveURL(/\/login$/);
}
