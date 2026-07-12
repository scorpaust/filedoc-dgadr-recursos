import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { UserRole } from '../../../shared/models';
import { resources } from '../../../shared/mocks/resources.mock';
import { users } from '../../../shared/mocks/users.mock';
import { ResourceMockService } from './resource-mock.service';
import { ResourceSearchParams } from './resource-search.model';

const BASE_PARAMS: ResourceSearchParams = {
  query: '',
  type: 'all',
  workflows: [],
  difficulties: [],
  sort: 'recent',
  page: 1,
  pageSize: 12,
};

describe('ResourceMockService', () => {
  let service: ResourceMockService;
  let authService: AuthService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ResourceMockService);
    authService = TestBed.inject(AuthService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function loginAs(role: UserRole): void {
    const user = users.find(
      (candidate) => candidate.role === role && candidate.status === 'active',
    );
    if (!user) {
      throw new Error(`No active mock user for role ${role}`);
    }
    authService.currentUser.set(user);
  }

  async function search(params: ResourceSearchParams) {
    const promise = firstValueFrom(service.search(params));
    await vi.advanceTimersByTimeAsync(300);
    return promise;
  }

  async function getBySlug(slug: string) {
    const promise = firstValueFrom(service.getBySlug(slug));
    await vi.advanceTimersByTimeAsync(300);
    return promise;
  }

  async function getRelated(ids: readonly string[]) {
    const promise = firstValueFrom(service.getRelated(ids));
    await vi.advanceTimersByTimeAsync(300);
    return promise;
  }

  it('never returns archived resources for any role', async () => {
    for (const role of ['EMPLOYEE', 'SUPPORT_AGENT', 'CONTENT_EDITOR', 'ADMIN'] as const) {
      loginAs(role);
      const result = await search(BASE_PARAMS);
      expect(result.items.some((resource) => resource.status === 'archived')).toBe(false);
    }
  });

  it('hides draft resources from EMPLOYEE and SUPPORT_AGENT', async () => {
    for (const role of ['EMPLOYEE', 'SUPPORT_AGENT'] as const) {
      loginAs(role);
      const result = await search({ ...BASE_PARAMS, pageSize: resources.length });
      expect(result.items.some((resource) => resource.status === 'draft')).toBe(false);
      const expectedPublished = resources.filter((resource) => resource.status === 'published');
      expect(result.total).toBe(expectedPublished.length);
    }
  });

  it('shows draft resources to CONTENT_EDITOR and ADMIN, alongside published ones', async () => {
    for (const role of ['CONTENT_EDITOR', 'ADMIN'] as const) {
      loginAs(role);
      const result = await search({ ...BASE_PARAMS, pageSize: resources.length });
      const expectedVisible = resources.filter((resource) => resource.status !== 'archived');
      expect(result.total).toBe(expectedVisible.length);
      expect(result.items.some((resource) => resource.status === 'draft')).toBe(true);
    }
  });

  it('filters by text query across title, summary and tags, ignoring case and accents', async () => {
    loginAs('ADMIN');
    const result = await search({ ...BASE_PARAMS, query: 'OFICIO', pageSize: resources.length });
    const expected = resources.filter(
      (resource) =>
        resource.status !== 'archived' &&
        (resource.title.toLowerCase().includes('ofício') ||
          resource.summary.toLowerCase().includes('ofício') ||
          resource.tags.some((tag) => tag.toLowerCase().includes('ofício'))),
    );
    expect(result.total).toBe(expected.length);
    expect(result.total).toBeGreaterThan(0);
  });

  it('filters by resource type in isolation', async () => {
    loginAs('EMPLOYEE');
    const result = await search({ ...BASE_PARAMS, type: 'video', pageSize: resources.length });
    expect(result.items.every((resource) => resource.type === 'video')).toBe(true);
    expect(result.total).toBeGreaterThan(0);
  });

  it('filters by workflow in isolation', async () => {
    loginAs('EMPLOYEE');
    const result = await search({
      ...BASE_PARAMS,
      workflows: ['Arquivo'],
      pageSize: resources.length,
    });
    expect(result.items.every((resource) => resource.workflow === 'Arquivo')).toBe(true);
    expect(result.total).toBeGreaterThan(0);
  });

  it('filters by difficulty in isolation', async () => {
    loginAs('EMPLOYEE');
    const result = await search({
      ...BASE_PARAMS,
      difficulties: ['avancada'],
      pageSize: resources.length,
    });
    expect(result.items.every((resource) => resource.difficulty === 'avancada')).toBe(true);
    expect(result.total).toBeGreaterThan(0);
  });

  it('combines multiple filters', async () => {
    loginAs('ADMIN');
    const result = await search({
      ...BASE_PARAMS,
      type: 'guide',
      difficulties: ['avancada'],
      pageSize: resources.length,
    });
    expect(
      result.items.every(
        (resource) => resource.type === 'guide' && resource.difficulty === 'avancada',
      ),
    ).toBe(true);
  });

  it('paginates results without mixing items across pages', async () => {
    loginAs('ADMIN');
    const pageSize = 5;
    const pageOne = await search({ ...BASE_PARAMS, page: 1, pageSize });
    const pageTwo = await search({ ...BASE_PARAMS, page: 2, pageSize });

    expect(pageOne.items.length).toBe(pageSize);
    expect(pageTwo.items.length).toBeGreaterThan(0);
    const pageOneIds = new Set(pageOne.items.map((resource) => resource.id));
    expect(pageTwo.items.every((resource) => !pageOneIds.has(resource.id))).toBe(true);
    expect(pageOne.total).toBe(pageTwo.total);
  });

  it('sorts by publication date descending when sort is "recent"', async () => {
    loginAs('ADMIN');
    const result = await search({ ...BASE_PARAMS, sort: 'recent', pageSize: resources.length });
    const dates = result.items.map((resource) => resource.publishedAt);
    const sortedDates = [...dates].sort().reverse();
    expect(dates).toEqual(sortedDates);
  });

  it('sorts alphabetically by title when sort is "alphabetical"', async () => {
    loginAs('ADMIN');
    const result = await search({
      ...BASE_PARAMS,
      sort: 'alphabetical',
      pageSize: resources.length,
    });
    const titles = result.items.map((resource) => resource.title);
    const sortedTitles = [...titles].sort((a, b) => a.localeCompare(b, 'pt'));
    expect(titles).toEqual(sortedTitles);
  });

  it('returns a published resource by slug for any role', async () => {
    const published = resources.find((resource) => resource.status === 'published');
    if (!published) {
      throw new Error('Expected at least one published mock resource');
    }
    loginAs('EMPLOYEE');
    const result = await getBySlug(published.slug);
    expect(result?.id).toBe(published.id);
  });

  it('does not return a draft resource by slug to EMPLOYEE, but does to CONTENT_EDITOR', async () => {
    const draft = resources.find((resource) => resource.status === 'draft');
    if (!draft) {
      throw new Error('Expected at least one draft mock resource');
    }

    loginAs('EMPLOYEE');
    expect(await getBySlug(draft.slug)).toBeUndefined();

    loginAs('CONTENT_EDITOR');
    expect((await getBySlug(draft.slug))?.id).toBe(draft.id);
  });

  it('never returns an archived resource by slug, regardless of role', async () => {
    const archived = resources.find((resource) => resource.status === 'archived');
    if (!archived) {
      throw new Error('Expected at least one archived mock resource');
    }
    loginAs('ADMIN');
    expect(await getBySlug(archived.slug)).toBeUndefined();
  });

  it('resolves related resources by id, preserving order, up to a maximum of 4', async () => {
    loginAs('ADMIN');
    const visible = resources.filter((resource) => resource.status !== 'archived').slice(0, 6);
    const ids = visible.map((resource) => resource.id);
    const related = await getRelated(ids);
    expect(related.length).toBe(4);
    expect(related.map((resource) => resource.id)).toEqual(ids.slice(0, 4));
  });

  it('excludes related ids that do not exist, or that are not visible to the current role', async () => {
    const draft = resources.find((resource) => resource.status === 'draft');
    const archived = resources.find((resource) => resource.status === 'archived');
    const published = resources.find((resource) => resource.status === 'published');
    if (!draft || !archived || !published) {
      throw new Error('Expected draft, archived and published mock resources');
    }

    loginAs('EMPLOYEE');
    const related = await getRelated([draft.id, archived.id, 'unknown-id', published.id]);
    expect(related.map((resource) => resource.id)).toEqual([published.id]);
  });
});
