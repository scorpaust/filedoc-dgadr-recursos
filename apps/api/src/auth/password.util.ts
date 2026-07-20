import { hash, verify } from '@node-rs/argon2';

/**
 * Argon2id, conforme `project-spec.md` ("Autenticação") — usado tanto pelos seeds de
 * desenvolvimento (Fase 2, BD) como pela futura camada de autenticação real.
 */
export async function hashPassword(plainTextPassword: string): Promise<string> {
  return hash(plainTextPassword);
}

export async function verifyPassword(
  passwordHash: string,
  plainTextPassword: string,
): Promise<boolean> {
  return verify(passwordHash, plainTextPassword);
}
