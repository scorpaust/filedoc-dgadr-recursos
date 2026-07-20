import { TestBed } from '@angular/core/testing';
import { FileUploadComponent, FileUploadSelection } from './file-upload.component';

describe('FileUploadComponent', () => {
  const originalCreateObjectURL = URL.createObjectURL;

  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
  });

  afterEach(() => {
    URL.createObjectURL = originalCreateObjectURL;
  });

  function setup(kind: 'video' | 'pdf' | 'image') {
    const fixture = TestBed.createComponent(FileUploadComponent);
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('label', 'Ficheiro principal');
    fixture.detectChanges();
    return fixture;
  }

  function selectFile(fixture: ReturnType<typeof setup>, file: File): void {
    const input = fixture.nativeElement.querySelector('input[type="file"]') as HTMLInputElement;
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('accepts a file with an allowed extension and size, emitting a selection with an object URL', () => {
    const fixture = setup('pdf');
    let emitted: FileUploadSelection | undefined;
    fixture.componentInstance.selectionChange.subscribe((value) => (emitted = value));

    const file = new File(['conteudo'], 'guia.pdf', { type: 'application/pdf' });
    selectFile(fixture, file);

    expect(emitted?.fileName).toBe('guia.pdf');
    expect(emitted?.objectUrl).toBe('blob:mock-url');
    expect(fixture.nativeElement.textContent).toContain('guia.pdf');
  });

  it('rejects a file with a disallowed extension for the given kind', () => {
    const fixture = setup('pdf');
    const file = new File(['conteudo'], 'documento.docx', {
      type: 'application/vnd.openxmlformats',
    });
    selectFile(fixture, file);

    expect(fixture.nativeElement.textContent).toContain('Ficheiro inválido');
  });

  it('rejects a file larger than the maximum allowed size', () => {
    const fixture = setup('image');
    const oversized = new File([new Uint8Array(6 * 1024 * 1024)], 'imagem.png', {
      type: 'image/png',
    });
    selectFile(fixture, oversized);

    expect(fixture.nativeElement.textContent).toContain('demasiado grande');
  });

  it('shows an image preview only for kind "image"', () => {
    const fixture = setup('image');
    const file = new File(['conteudo'], 'miniatura.png', { type: 'image/png' });
    selectFile(fixture, file);

    expect(fixture.nativeElement.querySelector('img')).toBeTruthy();
  });

  it('clears the selection and emits undefined', () => {
    const fixture = setup('pdf');
    let emitted: FileUploadSelection | undefined = { fileName: 'x', sizeBytes: 1, objectUrl: 'x' };
    fixture.componentInstance.selectionChange.subscribe((value) => (emitted = value));

    const file = new File(['conteudo'], 'guia.pdf', { type: 'application/pdf' });
    selectFile(fixture, file);

    const clearButton = Array.from(fixture.nativeElement.querySelectorAll('button')).find(
      (button) => (button as HTMLButtonElement).textContent?.includes('Remover'),
    ) as HTMLButtonElement;
    clearButton.click();
    fixture.detectChanges();

    expect(emitted).toBeUndefined();
  });
});
