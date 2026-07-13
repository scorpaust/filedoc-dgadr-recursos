import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { users } from '../../../shared/mocks/users.mock';
import { TipsFaqManagementComponent } from './tips-faq-management.component';

describe('TipsFaqManagementComponent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    const authService = TestBed.inject(AuthService);
    const editor = users.find((user) => user.role === 'CONTENT_EDITOR' && user.status === 'active');
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

  it('lists tips and faqs of every editorial status, including drafts', async () => {
    const fixture = TestBed.createComponent(TipsFaqManagementComponent);
    fixture.detectChanges();
    await flush(fixture);

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Rascunho');
  });

  it('adds a new tip and clears the input afterwards', async () => {
    const fixture = TestBed.createComponent(TipsFaqManagementComponent);
    fixture.detectChanges();
    await flush(fixture);
    const el = fixture.nativeElement as HTMLElement;

    const textarea = el.querySelector('#new-tip-text') as HTMLTextAreaElement;
    textarea.value = 'Nova dica de teste.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    (el.querySelector('.fdr-tips-faq-management__new-form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await flush(fixture);
    await flush(fixture);

    expect(el.textContent).toContain('Nova dica de teste.');
    expect((el.querySelector('#new-tip-text') as HTMLTextAreaElement).value).toBe('');
  });

  it('adds a new faq with the provided question, answer and category', async () => {
    const fixture = TestBed.createComponent(TipsFaqManagementComponent);
    fixture.detectChanges();
    await flush(fixture);
    const el = fixture.nativeElement as HTMLElement;

    function setValue(selector: string, value: string): void {
      const element = el.querySelector(selector) as HTMLInputElement | HTMLTextAreaElement;
      element.value = value;
      element.dispatchEvent(new Event('input'));
    }

    setValue('#new-faq-question', 'Pergunta de teste?');
    setValue('#new-faq-answer', 'Resposta de teste.');
    setValue('#new-faq-category', 'Categoria de teste');
    fixture.detectChanges();

    const forms = el.querySelectorAll('.fdr-tips-faq-management__new-form');
    (forms[1] as HTMLFormElement).dispatchEvent(new Event('submit'));
    await flush(fixture);
    await flush(fixture);

    expect(el.textContent).toContain('Pergunta de teste?');
    expect(el.textContent).toContain('Categoria de teste');
  });

  it('offers a "Restaurar" action for an archived tip, bringing it back to draft', async () => {
    const fixture = TestBed.createComponent(TipsFaqManagementComponent);
    fixture.detectChanges();
    await flush(fixture);
    const el = fixture.nativeElement as HTMLElement;

    const textarea = el.querySelector('#new-tip-text') as HTMLTextAreaElement;
    textarea.value = 'Dica a arquivar.';
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    (el.querySelector('.fdr-tips-faq-management__new-form') as HTMLFormElement).dispatchEvent(
      new Event('submit'),
    );
    await flush(fixture);
    await flush(fixture);

    const item = Array.from(el.querySelectorAll('.fdr-tips-faq-management__item')).find((li) =>
      li.textContent?.includes('Dica a arquivar.'),
    ) as HTMLElement;
    (item.querySelector('button[aria-label="Arquivar dica"]') as HTMLButtonElement).click();
    await flush(fixture);
    await flush(fixture);

    const archivedItem = Array.from(el.querySelectorAll('.fdr-tips-faq-management__item')).find(
      (li) => li.textContent?.includes('Dica a arquivar.'),
    ) as HTMLElement;
    const restoreButton = archivedItem.querySelector(
      'button[aria-label="Restaurar dica"]',
    ) as HTMLButtonElement;
    expect(restoreButton).toBeTruthy();
    restoreButton.click();
    await flush(fixture);
    await flush(fixture);

    const restoredItem = Array.from(el.querySelectorAll('.fdr-tips-faq-management__item')).find(
      (li) => li.textContent?.includes('Dica a arquivar.'),
    ) as HTMLElement;
    expect(restoredItem.textContent).toContain('Rascunho');
  });
});
