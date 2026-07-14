import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { users } from '../../../shared/mocks/users.mock';
import { ContentManagementPageComponent } from './content-management-page.component';

describe('ContentManagementPageComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const authService = TestBed.inject(AuthService);
    const editor = users.find(
      (user) => user.roles.includes('CONTENT_EDITOR') && user.status === 'active',
    );
    authService.currentUser.set(editor ?? null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  async function flush(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('renders the screen title, defaulting to the resources tab', async () => {
    const fixture = TestBed.createComponent(ContentManagementPageComponent);
    fixture.detectChanges();
    await flush(fixture);
    expect(fixture.nativeElement.textContent).toContain('Conteúdos');
    expect(fixture.nativeElement.querySelector('fdr-resource-table')).toBeTruthy();
  });

  function clickTab(fixture: { nativeElement: HTMLElement }, label: string): void {
    const button = Array.from(
      fixture.nativeElement.querySelectorAll('.fdr-segmented__option'),
    ).find((candidate) => candidate.textContent?.trim() === label) as HTMLButtonElement;
    button.click();
  }

  it('switches to the tips & faq tab', async () => {
    const fixture = TestBed.createComponent(ContentManagementPageComponent);
    fixture.detectChanges();
    await flush(fixture);

    clickTab(fixture, 'Dicas & FAQ');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('fdr-tips-faq-management')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('fdr-resource-table')).toBeFalsy();
  });

  it('switches to the taxonomies tab', async () => {
    const fixture = TestBed.createComponent(ContentManagementPageComponent);
    fixture.detectChanges();
    await flush(fixture);

    clickTab(fixture, 'Taxonomias');
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.nativeElement.querySelector('fdr-taxonomy-management')).toBeTruthy();
  });

  // Regressão: o atalho "Gerir →" do resumo de taxonomias (Fase 9) navega para
  // `/conteudos?tab=taxonomies` — este valor tem de coincidir com o `ContentTab` interno
  // (inglês), não com o rótulo em português mostrado na aba.
  it('opens directly on the taxonomies tab when the "tab" query param requests it', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: convertToParamMap({ tab: 'taxonomies' }) } },
        },
      ],
    });
    const authService = TestBed.inject(AuthService);
    const editor = users.find(
      (user) => user.roles.includes('CONTENT_EDITOR') && user.status === 'active',
    );
    authService.currentUser.set(editor ?? null);

    const fixture = TestBed.createComponent(ContentManagementPageComponent);
    fixture.detectChanges();
    await flush(fixture);

    expect(fixture.nativeElement.querySelector('fdr-taxonomy-management')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('fdr-resource-table')).toBeFalsy();
  });
});
