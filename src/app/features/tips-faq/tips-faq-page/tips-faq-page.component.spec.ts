import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { faqs } from '../../../shared/mocks/faqs.mock';
import { tips } from '../../../shared/mocks/tips.mock';
import { users } from '../../../shared/mocks/users.mock';
import { UserRole } from '../../../shared/models';
import { TipsFaqMockService } from '../data/tips-faq-mock.service';
import { TipsFaqPageComponent } from './tips-faq-page.component';

describe('TipsFaqPageComponent', () => {
  function createFixture(role: UserRole) {
    TestBed.configureTestingModule({});
    const authService = TestBed.inject(AuthService);
    const user = users.find(
      (candidate) => candidate.roles.includes(role) && candidate.status === 'active',
    );
    if (!user) {
      throw new Error(`No active mock user for role ${role}`);
    }
    authService.currentUser.set(user);
    return TestBed.createComponent(TipsFaqPageComponent);
  }

  async function settle(fixture: ReturnType<typeof createFixture>) {
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
  }

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the screen title', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Dicas & Perguntas frequentes',
    );
  });

  it('shows skeleton placeholders while loading', () => {
    const fixture = createFixture('EMPLOYEE');
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('fdr-skeleton').length).toBeGreaterThan(0);
  });

  it('shows published tips to an EMPLOYEE, but not draft ones', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const publishedTips = tips.filter((tip) => tip.status === 'published');
    const draftTip = tips.find((tip) => tip.status === 'draft')!;
    expect(el.querySelectorAll('fdr-tip-card').length).toBe(publishedTips.length);
    expect(el.textContent).not.toContain(draftTip.text);
  });

  it('shows draft tips to a CONTENT_EDITOR', async () => {
    const fixture = createFixture('CONTENT_EDITOR');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('fdr-tip-card').length).toBe(tips.length);
  });

  it('groups faqs by category, with a generic section for faqs without one', async () => {
    const fixture = createFixture('ADMIN');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const categories = [
      ...new Set(
        faqs.map((faq) => faq.category).filter((category): category is string => !!category),
      ),
    ];
    for (const category of categories) {
      expect(el.textContent).toContain(category);
    }
    expect(el.textContent).toContain('Outras perguntas');
  });

  it('toggles a faq accordion item, with aria-expanded reflecting the real state', async () => {
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    const el = fixture.nativeElement as HTMLElement;
    const trigger = el.querySelector('fdr-accordion-item button') as HTMLButtonElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');

    trigger.click();
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
  });

  it('hides draft faqs from an EMPLOYEE', async () => {
    const draftFaq = faqs.find((faq) => faq.status === 'draft')!;
    const fixture = createFixture('EMPLOYEE');
    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain(draftFaq.question);
  });

  it('shows draft faqs to a CONTENT_EDITOR', async () => {
    const draftFaq = faqs.find((faq) => faq.status === 'draft')!;
    const fixture = createFixture('CONTENT_EDITOR');
    await settle(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(draftFaq.question);
  });

  it('shows an empty state when there are no published tips or faqs for the current role', async () => {
    TestBed.configureTestingModule({
      providers: [
        {
          provide: TipsFaqMockService,
          useValue: { getTips: () => of([]), getFaqs: () => of([]) },
        },
      ],
    });
    const authService = TestBed.inject(AuthService);
    const user = users.find(
      (candidate) => candidate.roles.includes('EMPLOYEE') && candidate.status === 'active',
    )!;
    authService.currentUser.set(user);

    const fixture = TestBed.createComponent(TipsFaqPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('fdr-empty-state')).toBeTruthy();
  });
});
