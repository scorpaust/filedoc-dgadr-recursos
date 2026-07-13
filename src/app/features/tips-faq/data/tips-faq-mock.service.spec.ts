import { Observable, firstValueFrom } from 'rxjs';
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

  describe('gestão editorial (Fase 8)', () => {
    async function run<T>(observable: Observable<T>): Promise<T> {
      const promise = firstValueFrom(observable);
      await vi.advanceTimersByTimeAsync(300);
      return promise;
    }

    beforeEach(() => {
      loginAs('CONTENT_EDITOR');
    });

    it('creates a tip as draft, appended after the existing ones', async () => {
      const before = await run(service.listAllTips());
      const created = await run(service.createTip('Nova dica de teste.'));
      expect(created.status).toBe('draft');
      expect(created.sortOrder).toBe(before.length + 1);
    });

    it('rejects creating a tip with empty text', async () => {
      await expect(firstValueFrom(service.createTip('   '))).rejects.toThrow();
    });

    it('updates, publishes, unpublishes and archives a tip', async () => {
      const created = await run(service.createTip('Dica original.'));
      const updated = await run(service.updateTip(created.id, 'Dica editada.'));
      expect(updated.text).toBe('Dica editada.');

      const published = await run(service.publishTip(created.id));
      expect(published.status).toBe('published');

      const unpublished = await run(service.unpublishTip(created.id));
      expect(unpublished.status).toBe('draft');

      const archived = await run(service.archiveTip(created.id));
      expect(archived.status).toBe('archived');

      const restored = await run(service.restoreTip(created.id));
      expect(restored.status).toBe('draft');
    });

    it('reorders a tip up and down via sortOrder swap, without moving past the edges', async () => {
      const all = await run(service.listAllTips());
      const [first, second] = all;
      const movedUp = await run(service.reorderTip(second.id, 'up'));
      expect(movedUp.find((tip) => tip.id === second.id)?.sortOrder).toBe(first.sortOrder);

      const staysAtEdge = await run(service.reorderTip(first.id, 'up'));
      expect(staysAtEdge.find((tip) => tip.id === first.id)?.sortOrder).toBe(first.sortOrder);
    });

    it('creates a faq as draft with optional category', async () => {
      const created = await run(
        service.createFaq({ question: 'Pergunta de teste?', answer: 'Resposta de teste.' }),
      );
      expect(created.status).toBe('draft');
      expect(created.category).toBeUndefined();
    });

    it('rejects creating a faq without a question or answer', async () => {
      await expect(
        firstValueFrom(service.createFaq({ question: '', answer: 'Resposta.' })),
      ).rejects.toThrow();
    });

    it('updates, publishes, unpublishes and archives a faq', async () => {
      const created = await run(
        service.createFaq({ question: 'Pergunta original?', answer: 'Resposta original.' }),
      );
      const updated = await run(
        service.updateFaq(created.id, {
          question: 'Pergunta editada?',
          answer: 'Resposta editada.',
        }),
      );
      expect(updated.question).toBe('Pergunta editada?');

      const published = await run(service.publishFaq(created.id));
      expect(published.status).toBe('published');

      const unpublished = await run(service.unpublishFaq(created.id));
      expect(unpublished.status).toBe('draft');

      const archived = await run(service.archiveFaq(created.id));
      expect(archived.status).toBe('archived');

      const restored = await run(service.restoreFaq(created.id));
      expect(restored.status).toBe('draft');
    });

    it('reorders a faq down via sortOrder swap', async () => {
      const all = await run(service.listAllFaqs());
      const [first, second] = all;
      const movedDown = await run(service.reorderFaq(first.id, 'down'));
      expect(movedDown.find((faq) => faq.id === first.id)?.sortOrder).toBe(second.sortOrder);
    });
  });
});
