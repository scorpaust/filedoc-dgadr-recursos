import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DialogComponent } from './dialog.component';

@Component({
  imports: [DialogComponent],
  template: `
    <button type="button">Abrir</button>
    @if (open) {
      <fdr-dialog title="Confirmar ação" (closed)="open = false">
        <p>Tem a certeza?</p>
      </fdr-dialog>
    }
  `,
})
class HostComponent {
  open = false;
}

describe('DialogComponent', () => {
  it('renders the title and projected content', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    await fixture.whenStable();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.fdr-dialog__title')?.textContent).toContain('Confirmar ação');
    expect(el.querySelector('.fdr-dialog__content')?.textContent).toContain('Tem a certeza?');
  });

  it('emits closed when the close button is clicked', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('.fdr-dialog__close') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.open).toBe(false);
    expect(fixture.nativeElement.querySelector('fdr-dialog')).toBeNull();
  });

  it('emits closed when the scrim is clicked', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('.fdr-dialog-scrim') as HTMLElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.open).toBe(false);
  });

  it('emits closed when Escape is pressed', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.open = true;
    fixture.detectChanges();
    await fixture.whenStable();

    const dialog = fixture.nativeElement.querySelector('.fdr-dialog') as HTMLElement;
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.open).toBe(false);
  });

  // A captura automática de foco ao abrir é responsabilidade do CDK
  // (`cdkTrapFocusAutoCapture`) e depende de geometria real do layout, que o jsdom não
  // calcula — por isso é validada manualmente no browser (ver checklist de acessibilidade),
  // não aqui. A devolução do foco ao fechar é lógica nossa e é testada abaixo.
  it('restores focus to the previously focused element on close', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    trigger.focus();

    fixture.componentInstance.open = true;
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('.fdr-dialog__close') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(document.activeElement).toBe(trigger);
  });
});
