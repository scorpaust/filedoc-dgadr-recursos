import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let closeSpy: ReturnType<typeof vi.fn>;

  function setup(data: ConfirmDialogData) {
    closeSpy = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: DialogRef, useValue: { close: closeSpy } },
        { provide: DIALOG_DATA, useValue: data },
      ],
    });
    const fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.detectChanges();
    return fixture;
  }

  it('renders the provided title and message', () => {
    const fixture = setup({ title: 'Arquivar recurso', message: 'Tem a certeza?' });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Arquivar recurso');
    expect(text).toContain('Tem a certeza?');
  });

  it('closes with true when confirmed', () => {
    const fixture = setup({ title: 'Arquivar', message: 'Confirmar?' });
    const confirmButton = fixture.nativeElement.querySelector('.fdr-button--primary');
    (confirmButton as HTMLButtonElement).click();
    expect(closeSpy).toHaveBeenCalledWith(true);
  });

  it('closes with false when cancelled', () => {
    const fixture = setup({ title: 'Arquivar', message: 'Confirmar?' });
    const cancelButton = fixture.nativeElement.querySelector('.fdr-button--outline');
    (cancelButton as HTMLButtonElement).click();
    expect(closeSpy).toHaveBeenCalledWith(false);
  });
});
