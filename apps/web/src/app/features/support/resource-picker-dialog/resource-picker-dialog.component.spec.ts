import { DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../../core/auth/auth.service';
import { users } from '../../../shared/mocks/users.mock';
import { ResourceMockService } from '../../resources/data/resource-mock.service';
import { ResourceService } from '../../resources/data/resource.service';
import { ResourcePickerDialogComponent } from './resource-picker-dialog.component';

describe('ResourcePickerDialogComponent', () => {
  let closeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    closeSpy = vi.fn();
    TestBed.configureTestingModule({
      // O componente consome `ResourceService` (API real, Fase 3 — Integração); este teste
      // continua a exercitar a pesquisa através do mesmo mock de dados (Fase 3 — UI), só
      // trocando qual serviço a injeção resolve (mesma técnica das Fases 6/7/8).
      providers: [
        { provide: DialogRef, useValue: { close: closeSpy } },
        { provide: ResourceService, useExisting: ResourceMockService },
      ],
    });
    const authService = TestBed.inject(AuthService);
    const employee = users.find(
      (user) => user.roles.includes('EMPLOYEE') && user.status === 'active',
    );
    authService.currentUser.set(employee ?? null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('lists matching resources and closes the dialog with the chosen one', async () => {
    const fixture = TestBed.createComponent(ResourcePickerDialogComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    const option = fixture.nativeElement.querySelector(
      '.fdr-resource-picker__option',
    ) as HTMLButtonElement;
    expect(option).toBeTruthy();
    option.click();

    expect(closeSpy).toHaveBeenCalledWith(expect.objectContaining({ id: expect.any(String) }));
  });

  it('closes the dialog without a result when dismissed', async () => {
    const fixture = TestBed.createComponent(ResourcePickerDialogComponent);
    fixture.detectChanges();
    await vi.advanceTimersByTimeAsync(300);

    (fixture.componentInstance as unknown as { close(): void }).close();
    expect(closeSpy).toHaveBeenCalledWith(undefined);
  });
});
