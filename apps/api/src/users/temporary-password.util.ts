import { randomBytes } from 'node:crypto';

/**
 * A UI de criação de conta (Fase 9 — UI) nunca pede palavra-passe: "a atribuição de
 * credenciais reais é responsabilidade do backend". Sem um fluxo de convite/definição de
 * palavra-passe nesta fase (fora do âmbito de fase-8-integracao-administracao.md), gera-se
 * aqui uma palavra-passe temporária aleatória, forte o suficiente para nunca ser adivinhada —
 * nunca devolvida ao cliente nem registada em logs, só o seu hash Argon2id é persistido.
 * Ponto em aberto: sem mecanismo de entrega (e-mail) nem de reposição, a conta criada só fica
 * utilizável depois de uma fase futura que resolva a entrega desta credencial inicial.
 */
export function generateTemporaryPassword(): string {
  return randomBytes(24).toString('base64url');
}
