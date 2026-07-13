import { Observable, firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { users } from '../../../shared/mocks/users.mock';
import { ResourceMockService } from '../../resources/data/resource-mock.service';
import { TaxonomyMockService } from './taxonomy-mock.service';

describe('TaxonomyMockService', () => {
  let service: TaxonomyMockService;
  let resourceService: ResourceMockService;
  let authService: AuthService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TaxonomyMockService);
    resourceService = TestBed.inject(ResourceMockService);
    authService = TestBed.inject(AuthService);
    const editor = users.find((user) => user.role === 'CONTENT_EDITOR' && user.status === 'active');
    authService.currentUser.set(editor ?? null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function run<T>(observable: Observable<T>): Promise<T> {
    const promise = firstValueFrom(observable);
    await vi.advanceTimersByTimeAsync(300);
    return promise;
  }

  it('lists workflows, document types and tags sorted by order', async () => {
    const workflows = await run(service.list('workflow'));
    expect(workflows.length).toBeGreaterThan(0);
    expect(workflows.every((item) => item.kind === 'workflow')).toBe(true);
    const orders = workflows.map((item) => item.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('creates a new taxonomy, appended after the existing ones of the same kind', async () => {
    const before = await run(service.list('tag'));
    const created = await run(service.create('tag', 'nova-etiqueta'));
    expect(created.active).toBe(true);
    expect(created.order).toBe(before.length + 1);
  });

  it('rejects creating a duplicate taxonomy label within the same kind', async () => {
    const [existing] = await run(service.list('workflow'));
    await expect(firstValueFrom(service.create('workflow', existing.label))).rejects.toThrow();
  });

  it('updates a taxonomy label', async () => {
    const created = await run(service.create('tag', 'etiqueta-antiga'));
    const updated = await run(service.update(created.id, 'etiqueta-nova'));
    expect(updated.label).toBe('etiqueta-nova');
  });

  it('toggles the active state of a taxonomy', async () => {
    const created = await run(service.create('tag', 'etiqueta-alternavel'));
    const toggled = await run(service.toggleActive(created.id));
    expect(toggled.active).toBe(false);
    const toggledAgain = await run(service.toggleActive(created.id));
    expect(toggledAgain.active).toBe(true);
  });

  it('reorders a taxonomy up and down, swapping order with its neighbour', async () => {
    const [first, second] = await run(service.list('tag'));
    const reordered = await run(service.reorder(second.id, 'up'));
    const newFirst = reordered.find((item) => item.id === second.id);
    const newSecond = reordered.find((item) => item.id === first.id);
    expect(newFirst?.order).toBe(first.order);
    expect(newSecond?.order).toBe(second.order);
  });

  it('does not move a taxonomy beyond the first or last position', async () => {
    const items = await run(service.list('tag'));
    const [firstItem] = items;
    const reordered = await run(service.reorder(firstItem.id, 'up'));
    expect(reordered.find((item) => item.id === firstItem.id)?.order).toBe(firstItem.order);
  });

  it('blocks deleting a taxonomy associated with existing resources', async () => {
    const [workflowInUse] = await run(service.list('workflow'));
    vi.spyOn(resourceService, 'isTaxonomyInUse').mockReturnValue(true);
    await expect(firstValueFrom(service.delete(workflowInUse.id))).rejects.toThrow();
  });

  it('deletes a taxonomy that is not associated with any resource', async () => {
    const created = await run(service.create('tag', 'etiqueta-nao-usada'));
    vi.spyOn(resourceService, 'isTaxonomyInUse').mockReturnValue(false);
    await run(service.delete(created.id));
    const remaining = await run(service.list('tag'));
    expect(remaining.some((item) => item.id === created.id)).toBe(false);
  });
});
