import { hashPassword, verifyPassword } from './password.util';

describe('password.util', () => {
  it('produz um hash Argon2id, nunca a palavra-passe em texto simples', async () => {
    const plainTextPassword = 'Demo123!';

    const passwordHash = await hashPassword(plainTextPassword);

    expect(passwordHash).not.toBe(plainTextPassword);
    expect(passwordHash.startsWith('$argon2id$')).toBe(true);
  });

  it('valida a palavra-passe correta contra o hash', async () => {
    const plainTextPassword = 'Demo123!';
    const passwordHash = await hashPassword(plainTextPassword);

    await expect(verifyPassword(passwordHash, plainTextPassword)).resolves.toBe(
      true,
    );
  });

  it('rejeita uma palavra-passe incorreta', async () => {
    const passwordHash = await hashPassword('Demo123!');

    await expect(verifyPassword(passwordHash, 'palavra-errada')).resolves.toBe(
      false,
    );
  });
});
