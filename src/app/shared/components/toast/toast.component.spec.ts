import { TestBed } from '@angular/core/testing';
import { ToastComponent } from './toast.component';
import { ToastService } from './toast.service';

describe('ToastComponent', () => {
  it('renders toasts pushed to the service inside a live region', async () => {
    const fixture = TestBed.createComponent(ToastComponent);
    const service = TestBed.inject(ToastService);
    service.success('Pedido criado com sucesso.');
    fixture.detectChanges();
    await fixture.whenStable();
    const container = fixture.nativeElement.querySelector('.fdr-toast-container') as HTMLElement;
    expect(container.getAttribute('aria-live')).toBe('polite');
    expect(fixture.nativeElement.querySelector('.fdr-toast--success')).toBeTruthy();
  });

  it('distinguishes success and error toasts beyond color, via distinct icons', async () => {
    const fixture = TestBed.createComponent(ToastComponent);
    const service = TestBed.inject(ToastService);
    service.error('Falha ao concluir o pedido.');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.fdr-toast--error')).toBeTruthy();
  });

  it('dismisses a toast when its close button is clicked', async () => {
    const fixture = TestBed.createComponent(ToastComponent);
    const service = TestBed.inject(ToastService);
    service.success('Mensagem');
    fixture.detectChanges();
    await fixture.whenStable();
    (fixture.nativeElement.querySelector('.fdr-toast__close') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.fdr-toast')).toBeNull();
  });
});
