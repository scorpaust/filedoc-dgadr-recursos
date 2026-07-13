import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { UserRole } from '../../../shared/models';
import { faqs } from '../../../shared/mocks/faqs.mock';
import { tips } from '../../../shared/mocks/tips.mock';
import { users } from '../../../shared/mocks/users.mock';
import { TipsFaqMockService } from './tips-faq-mock.service';

describe('TipsFaqMockService', () => {
  let service: TipsFaqMockService;
  let authService: AuthService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(TipsFaqMockService);
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

  async function getTips() {
    const promise = firstValueFrom(service.getTips());
    await vi.advanceTimersByTimeAsync(300);
    return promise;
  }

  async function getFaqs() {
    const promise = firstValueFrom(service.getFaqs());
    await vi.advanceTimersByTimeAsync(300);
    return promise;
  }

  it('hides draft tips from EMPLOYEE and SUPPORT_AGENT', async () => {
    for (const role of ['EMPLOYEE', 'SUPPORT_AGENT'] as const) {
      loginAs(role);
      const result = await getTips();
      expect(result.some((tip) => tip.status === 'draft')).toBe(false);
      const expectedPublished = tips.filter((tip) => tip.status === 'published');
      expect(result.length).toBe(expectedPublished.length);
    }
  });

  it('shows draft tips to CONTENT_EDITOR and ADMIN, alongside published ones', async () => {
    for (const role of ['CONTENT_EDITOR', 'ADMIN'] as const) {
      loginAs(role);
      const result = await getTips();
      expect(result.length).toBe(tips.length);
      expect(result.some((tip) => tip.status === 'draft')).toBe(true);
    }
  });

  it('sorts tips by sortOrder ascending', async () => {
    loginAs('ADMIN');
    const result = await getTips();
    const orders = result.map((tip) => tip.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
  });

  it('hides draft faqs from EMPLOYEE and SUPPORT_AGENT', async () => {
    for (const role of ['EMPLOYEE', 'SUPPORT_AGENT'] as const) {
      loginAs(role);
      const result = await getFaqs();
      expect(result.some((faq) => faq.status === 'draft')).toBe(false);
      const expectedPublished = faqs.filter((faq) => faq.status === 'published');
      expect(result.length).toBe(expectedPublished.length);
    }
  });

  it('shows draft faqs to CONTENT_EDITOR and ADMIN, alongside published ones', async () => {
    for (const role of ['CONTENT_EDITOR', 'ADMIN'] as const) {
      loginAs(role);
      const result = await getFaqs();
      expect(result.length).toBe(faqs.length);
      expect(result.some((faq) => faq.status === 'draft')).toBe(true);
    }
  });

  it('sorts faqs by sortOrder ascending, keeping the category alongside each item', async () => {
    loginAs('ADMIN');
    const result = await getFaqs();
    const orders = result.map((faq) => faq.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(result.some((faq) => faq.category !== undefined)).toBe(true);
    expect(result.some((faq) => faq.category === undefined)).toBe(true);
  });
});
