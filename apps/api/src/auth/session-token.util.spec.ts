import { generateSessionToken, hashSessionToken } from './session-token.util';

describe('session-token.util', () => {
  it('gera tokens não previsíveis e diferentes a cada chamada', () => {
    const first = generateSessionToken();
    const second = generateSessionToken();

    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThan(20);
  });

  it('produz sempre o mesmo hash para o mesmo token e segredo', () => {
    const token = generateSessionToken();

    const first = hashSessionToken(token, 'segredo-de-teste');
    const second = hashSessionToken(token, 'segredo-de-teste');

    expect(first).toBe(second);
    expect(first).not.toBe(token);
  });

  it('produz hashes diferentes para segredos diferentes (o segredo funciona como pepper)', () => {
    const token = generateSessionToken();

    const withFirstSecret = hashSessionToken(token, 'segredo-um');
    const withSecondSecret = hashSessionToken(token, 'segredo-dois');

    expect(withFirstSecret).not.toBe(withSecondSecret);
  });
});
