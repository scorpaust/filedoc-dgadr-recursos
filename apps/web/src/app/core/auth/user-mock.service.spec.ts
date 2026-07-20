import { Observable, firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { UserMockService } from './user-mock.service';

describe('UserMockService', () => {
  let service: UserMockService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserMockService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function run<T>(observable: Observable<T>): Promise<T> {
    const promise = firstValueFrom(observable);
    await vi.advanceTimersByTimeAsync(300);
    return promise;
  }

  it('lists every seeded mock user by default', async () => {
    const result = await run(service.list());
    expect(result.length).toBeGreaterThanOrEqual(6);
  });

  it('filters by role, matching a user whose roles array contains it — not by equality', async () => {
    const admins = await run(service.list({ roles: ['ADMIN'] }));
    expect(admins.every((user) => user.roles.includes('ADMIN'))).toBe(true);
    // João Antunes acumula CONTENT_EDITOR + ADMIN — deve aparecer em ambos os filtros.
    const editors = await run(service.list({ roles: ['CONTENT_EDITOR'] }));
    expect(admins.some((user) => user.id === 'user-3')).toBe(true);
    expect(editors.some((user) => user.id === 'user-3')).toBe(true);
  });

  it('filters by status', async () => {
    const inactive = await run(service.list({ status: 'inactive' }));
    expect(inactive.every((user) => user.status === 'inactive')).toBe(true);
    expect(inactive.some((user) => user.id === 'user-4')).toBe(true);
  });

  it('filters by name or e-mail, ignoring case and accents', async () => {
    const byName = await run(service.list({ query: 'marta' }));
    expect(byName.some((user) => user.id === 'user-1')).toBe(true);
    const byEmail = await run(service.list({ query: 'ANA.FERREIRA' }));
    expect(byEmail.some((user) => user.id === 'user-5')).toBe(true);
  });

  it('creates a user with more than one role at once', async () => {
    const created = await run(
      service.create({
        name: 'Nova Utilizadora',
        email: 'nova.utilizadora@dgadr.gov.pt',
        career: 'Técnico Superior',
        roles: ['SUPPORT_AGENT', 'CONTENT_EDITOR'],
      }),
    );
    expect(created.roles).toEqual(['SUPPORT_AGENT', 'CONTENT_EDITOR']);
    expect(created.status).toBe('active');
  });

  it('rejects creating a user without at least one role', async () => {
    await expect(
      firstValueFrom(
        service.create({
          name: 'Sem Função',
          email: 'sem.funcao@dgadr.gov.pt',
          career: 'Técnico Superior',
          roles: [],
        }),
      ),
    ).rejects.toThrow();
  });

  it('rejects creating a user with an e-mail already in use', async () => {
    await expect(
      firstValueFrom(
        service.create({
          name: 'Duplicado',
          email: 'marta.silva@dgadr.gov.pt',
          career: 'Técnico Superior',
          roles: ['EMPLOYEE'],
        }),
      ),
    ).rejects.toThrow();
  });

  it('assigns a new set of roles to an existing user, adding and removing', async () => {
    const updated = await run(service.assignRoles('user-1', ['EMPLOYEE', 'SUPPORT_AGENT']));
    expect(updated.roles).toEqual(['EMPLOYEE', 'SUPPORT_AGENT']);
    const reverted = await run(service.assignRoles('user-1', ['EMPLOYEE']));
    expect(reverted.roles).toEqual(['EMPLOYEE']);
  });

  it('rejects assigning an empty set of roles', async () => {
    await expect(firstValueFrom(service.assignRoles('user-1', []))).rejects.toThrow();
  });

  it('activates and deactivates a user', async () => {
    const deactivated = await run(service.deactivate('user-1'));
    expect(deactivated.status).toBe('inactive');
    const activated = await run(service.activate('user-1'));
    expect(activated.status).toBe('active');
  });

  it('simulates invalidating sessions, resolving successfully', async () => {
    await expect(run(service.invalidateSessions('user-1'))).resolves.toBeUndefined();
  });

  it('blocks removing the ADMIN role from the last user who has it, even with other roles', async () => {
    // Estado inicial dos mocks: user-3 (CONTENT_EDITOR + ADMIN) e user-5 (ADMIN) são os
    // dois administradores. Remover ADMIN de user-5 primeiro deixa user-3 como o último.
    await run(service.assignRoles('user-5', ['CONTENT_EDITOR']));

    await expect(
      firstValueFrom(service.assignRoles('user-3', ['CONTENT_EDITOR'])),
    ).rejects.toThrow();

    const stillAdmin = await run(service.list({ roles: ['ADMIN'] }));
    expect(stillAdmin).toHaveLength(1);
    expect(stillAdmin[0].id).toBe('user-3');
  });

  it('blocks deactivating the last user with the ADMIN role, even with other roles', async () => {
    await run(service.assignRoles('user-5', ['CONTENT_EDITOR']));

    await expect(firstValueFrom(service.deactivate('user-3'))).rejects.toThrow();
    expect(service.isActive('user-3')).toBe(true);
  });

  it('allows removing the ADMIN role from an administrator when more than one exists', async () => {
    const updated = await run(service.assignRoles('user-3', ['CONTENT_EDITOR']));
    expect(updated.roles).toEqual(['CONTENT_EDITOR']);
  });

  it('allows deactivating an administrator when more than one exists', async () => {
    const deactivated = await run(service.deactivate('user-3'));
    expect(deactivated.status).toBe('inactive');
  });
});
