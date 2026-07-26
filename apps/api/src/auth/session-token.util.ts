import { createHmac, randomBytes } from 'node:crypto';

export const SESSION_COOKIE_NAME = 'fdr_session';

/**
 * Token de sessão opaco (nunca guardado em claro na BD — só o seu hash, em
 * `Session.tokenHash`). `SESSION_SECRET` funciona como pepper: mesmo que a
 * tabela `Session` seja exposta, o hash não é reproduzível sem o segredo do
 * ambiente (coding-standards.md — "não utilizar identificadores sequenciais
 * como mecanismo de segurança").
 */
export function generateSessionToken(): string {
  return randomBytes(32).toString('base64url');
}

export function hashSessionToken(token: string, sessionSecret: string): string {
  return createHmac('sha256', sessionSecret).update(token).digest('hex');
}
