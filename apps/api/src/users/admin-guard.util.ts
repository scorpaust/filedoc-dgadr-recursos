/**
 * Regra do "último ADMIN": função utilitária isolada e testada (ainda sem camada de
 * serviço formal nesta fase — ver `docs/decisoes-seeds.md`), a promover para um serviço
 * real na via de integração de funcionalidades, sem reescrever esta lógica.
 */
export class LastAdminError extends Error {
  constructor() {
    super(
      'Não é possível remover a função ADMIN do último administrador ativo.',
    );
    this.name = 'LastAdminError';
  }
}

/**
 * @param activeAdminUserIds ids de todos os utilizadores que atualmente têm a função ADMIN.
 * @param targetUserId id do utilizador a quem se pretende remover a função ADMIN.
 * @throws {LastAdminError} quando `targetUserId` é o único utilizador em `activeAdminUserIds`.
 */
export function assertCanRemoveAdminRole(
  activeAdminUserIds: readonly string[],
  targetUserId: string,
): void {
  const isTargetCurrentlyAdmin = activeAdminUserIds.includes(targetUserId);
  if (!isTargetCurrentlyAdmin) {
    return;
  }

  if (activeAdminUserIds.length <= 1) {
    throw new LastAdminError();
  }
}
