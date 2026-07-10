import { TestBed } from '@angular/core/testing';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({});
    service = TestBed.inject(ToastService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds a success toast', () => {
    service.success('Pedido criado com sucesso.');
    expect(service.toasts().length).toBe(1);
    expect(service.toasts()[0].type).toBe('success');
  });

  it('adds an error toast', () => {
    service.error('Não foi possível concluir o pedido.');
    expect(service.toasts()[0].type).toBe('error');
  });

  it('dismisses a toast by id', () => {
    service.success('Mensagem');
    const id = service.toasts()[0].id;
    service.dismiss(id);
    expect(service.toasts().length).toBe(0);
  });

  it('auto-dismisses a toast after a timeout', () => {
    service.success('Mensagem temporária');
    expect(service.toasts().length).toBe(1);
    vi.advanceTimersByTime(5000);
    expect(service.toasts().length).toBe(0);
  });
});
