import { ActivatedRoute, Params, provideRouter } from '@angular/router';
import { convertToParamMap } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { resources } from '../../../shared/mocks/resources.mock';
import { users } from '../../../shared/mocks/users.mock';
import { UserRole } from '../../../shared/models';
import { ResourceCatalogPageComponent } from './resource-catalog-page.component';

function fakeRoute(queryParams: Params = {}): ActivatedRoute {
  return {
    snapshot: { queryParamMap: convertToParamMap(queryParams) },
  } as unknown as ActivatedRoute;
}

const PUBLISHED_COUNT = resources.filter((resource) => resource.status === 'published').length;
const DRAFT_COUNT = resources.filter((resource) => resource.status === 'draft').length;

describe('ResourceCatalogPageComponent', () => {
  // A construção do fixture já dispara a pesquisa inicial (toSignal subscreve de
  // imediato), pelo que a sessão simulada tem de ficar definida antes de criar o
  // componente — caso contrário a primeira pesquisa corre sem função atribuída.
  function createFixture(role: UserRole, queryParams: Params = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: fakeRoute(queryParams) },
      ],
    });
    const authService = TestBed.inject(AuthService);
    const user = users.find(
      (candidate) => candidate.role === role && candidate.status === 'active',
    );
    if (!user) {
      throw new Error(`No active mock user for role ${role}`);
    }
    authService.currentUser.set(user);
    return TestBed.createComponent(ResourceCatalogPageComponent);
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows skeleton placeholders while the simulated search is in flight', () => {
    const fixture = createFixture('EMPLOYEE');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('fdr-skeleton').length).toBeGreaterThan(0);
  });

  it('shows only published resources to an EMPLOYEE', async () => {
    const fixture = createFixture('EMPLOYEE');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain(`${PUBLISHED_COUNT} recursos encontrados`);
  });

  it('shows published and draft resources to a CONTENT_EDITOR', async () => {
    const fixture = createFixture('CONTENT_EDITOR');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.textContent).toContain(`${PUBLISHED_COUNT + DRAFT_COUNT} recursos encontrados`);
  });

  it('restores the search text and type filter from the URL on load', async () => {
    const fixture = createFixture('ADMIN', { q: 'ofício', tipo: 'guia' });
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect((el.querySelector('#catalog-search') as HTMLInputElement).value).toBe('ofício');
    const guideOption = Array.from(el.querySelectorAll('.fdr-segmented__option')).find(
      (button) => button.textContent?.trim() === 'Guia PDF',
    );
    expect(guideOption?.getAttribute('aria-checked')).toBe('true');
  });

  it('restores the current page from the URL on load', async () => {
    const fixture = createFixture('EMPLOYEE', { pagina: '2' });
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const currentPageButton = el.querySelector('[aria-current="page"]');
    expect(currentPageButton?.textContent?.trim()).toBe('2');
  });

  it('filters results by type when the segmented control is used', async () => {
    const fixture = createFixture('ADMIN');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const videoOption = Array.from(el.querySelectorAll('.fdr-segmented__option')).find(
      (button) => button.textContent?.trim() === 'Vídeo',
    ) as HTMLButtonElement;
    videoOption.click();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const expectedCount = resources.filter(
      (resource) => resource.status !== 'archived' && resource.type === 'video',
    ).length;
    expect(el.textContent).toContain(`${expectedCount} recursos encontrados`);
    expect(el.querySelector('.fdr-empty-state')).toBeFalsy();
  });

  it('filters results as the search text changes, after the debounce delay', async () => {
    const fixture = createFixture('ADMIN');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('#catalog-search') as HTMLInputElement;
    input.value = 'arquivo histórico';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(250);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(el.textContent).toContain('1 recurso encontrado');
    expect(el.textContent).toContain('Consultar o arquivo histórico');
  });

  it('shows the empty state for a query with no matches, and "Limpar filtros" restores the full list', async () => {
    const fixture = createFixture('ADMIN');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    let el = fixture.nativeElement as HTMLElement;
    const input = el.querySelector('#catalog-search') as HTMLInputElement;
    input.value = 'inexistente-xyz';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(250);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-empty-state')).toBeTruthy();

    (el.querySelector('.fdr-empty-state button') as HTMLButtonElement).click();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    el = fixture.nativeElement as HTMLElement;
    const expectedVisible = resources.filter((resource) => resource.status !== 'archived').length;
    expect(el.textContent).toContain(`${expectedVisible} recursos encontrados`);
    expect((el.querySelector('#catalog-search') as HTMLInputElement).value).toBe('');
  });

  it('shows pagination controls when there is more than one page of results', async () => {
    const fixture = createFixture('EMPLOYEE');
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('fdr-pagination')).toBeTruthy();
  });
});
