import { Router, provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { users } from '../../../shared/mocks/users.mock';
import { resources } from '../../../shared/mocks/resources.mock';
import { ResourceFormPageComponent } from './resource-form-page.component';

describe('ResourceFormPageComponent', () => {
  const originalCreateObjectURL = URL.createObjectURL;

  beforeEach(() => {
    vi.useFakeTimers();
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const authService = TestBed.inject(AuthService);
    const editor = users.find(
      (user) => user.roles.includes('CONTENT_EDITOR') && user.status === 'active',
    );
    authService.currentUser.set(editor ?? null);
  });

  afterEach(() => {
    vi.useRealTimers();
    URL.createObjectURL = originalCreateObjectURL;
  });

  async function flush(fixture: { detectChanges(): void; whenStable(): Promise<unknown> }) {
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function setValue(
    root: HTMLElement,
    selector: string,
    value: string,
    eventName: 'input' | 'change' = 'input',
  ): void {
    const element = root.querySelector(selector) as
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    element.value = value;
    element.dispatchEvent(new Event(eventName));
  }

  function selectFile(input: HTMLInputElement, file: File): void {
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
  }

  it('renders the "create" title when no id is bound', async () => {
    const fixture = TestBed.createComponent(ResourceFormPageComponent);
    await flush(fixture);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Criar recurso');
  });

  it('saves as a draft with only title and type filled in', async () => {
    const fixture = TestBed.createComponent(ResourceFormPageComponent);
    await flush(fixture);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const el = fixture.nativeElement as HTMLElement;

    setValue(el, '#resource-title', 'Recurso mínimo de teste');
    fixture.detectChanges();

    const saveDraftButton = el.querySelector(
      '.fdr-resource-form__actions button',
    ) as HTMLButtonElement;
    saveDraftButton.click();
    fixture.detectChanges();
    await flush(fixture);

    expect(navigateSpy).toHaveBeenCalledWith('/conteudos');
  });

  it('blocks publishing when required fields are missing, showing inline errors', async () => {
    const fixture = TestBed.createComponent(ResourceFormPageComponent);
    await flush(fixture);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const el = fixture.nativeElement as HTMLElement;

    const publishButton = Array.from(el.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Publicar'),
    ) as HTMLButtonElement;
    publishButton.click();
    fixture.detectChanges();

    expect(el.textContent).toContain('O título é obrigatório.');
    expect(el.textContent).toContain('ficheiro principal');
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('publishes successfully once every required field and file is provided', async () => {
    const fixture = TestBed.createComponent(ResourceFormPageComponent);
    await flush(fixture);
    const router = TestBed.inject(Router);
    const navigateSpy = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    const el = fixture.nativeElement as HTMLElement;

    setValue(el, '#resource-title', 'Recurso completo de teste');
    setValue(el, '#resource-slug', 'recurso-completo-de-teste');
    setValue(el, '#resource-summary', 'Resumo completo.');
    setValue(el, '#resource-description', 'Descrição completa.');
    setValue(el, '#resource-difficulty', 'iniciacao', 'change');
    fixture.detectChanges();
    setValue(el, '#resource-workflow', 'Criação e registo', 'change');
    setValue(el, '#resource-document-type', 'Informação', 'change');
    setValue(el, '#resource-duration', '3:00');
    fixture.detectChanges();

    const [videoInput] = Array.from(
      el.querySelectorAll('input[type="file"]'),
    ) as HTMLInputElement[];
    selectFile(videoInput, new File(['x'], 'video.mp4', { type: 'video/mp4' }));
    fixture.detectChanges();

    const publishButton = Array.from(el.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Publicar'),
    ) as HTMLButtonElement;
    publishButton.click();
    await flush(fixture);
    await flush(fixture);

    expect(navigateSpy).toHaveBeenCalledWith('/conteudos');
  });

  it('patches the form from an existing resource when editing, and offers preview/despublicar', async () => {
    const published = resources.find(
      (resource) => resource.status === 'published' && resource.type === 'video',
    );
    if (!published) {
      throw new Error('Expected a published video mock resource');
    }
    const fixture = TestBed.createComponent(ResourceFormPageComponent);
    fixture.componentRef.setInput('id', published.id);
    await flush(fixture);
    const el = fixture.nativeElement as HTMLElement;

    expect(el.textContent).toContain('Editar recurso');
    expect((el.querySelector('#resource-title') as HTMLInputElement).value).toBe(published.title);
    expect(el.textContent).toContain('Despublicar');
    expect(el.textContent).toContain('Pré-visualizar');
  });

  it('generates a slug from the title', async () => {
    const fixture = TestBed.createComponent(ResourceFormPageComponent);
    await flush(fixture);
    const el = fixture.nativeElement as HTMLElement;

    setValue(el, '#resource-title', 'Um Título de Exemplo');
    fixture.detectChanges();

    const generateButton = Array.from(el.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('Gerar a partir do título'),
    ) as HTMLButtonElement;
    generateButton.click();
    fixture.detectChanges();

    expect((el.querySelector('#resource-slug') as HTMLInputElement).value).toBe(
      'um-titulo-de-exemplo',
    );
  });
});
