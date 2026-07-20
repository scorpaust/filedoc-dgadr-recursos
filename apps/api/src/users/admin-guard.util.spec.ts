import { assertCanRemoveAdminRole, LastAdminError } from './admin-guard.util';

describe('admin-guard.util', () => {
  it('bloqueia a remoção quando o utilizador é o único ADMIN', () => {
    expect(() => assertCanRemoveAdminRole(['user-ana'], 'user-ana')).toThrow(
      LastAdminError,
    );
  });

  it('permite a remoção quando existem outros ADMIN', () => {
    expect(() =>
      assertCanRemoveAdminRole(['user-ana', 'user-joao'], 'user-ana'),
    ).not.toThrow();
  });

  it('não bloqueia a remoção de um utilizador que não é ADMIN', () => {
    expect(() =>
      assertCanRemoveAdminRole(['user-ana'], 'user-marta'),
    ).not.toThrow();
  });

  it('não bloqueia quando a lista de administradores está vazia (utilizador já não é admin)', () => {
    expect(() => assertCanRemoveAdminRole([], 'user-ana')).not.toThrow();
  });
});
