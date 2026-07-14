import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { firstValueFrom } from 'rxjs';
import { TestBed } from '@angular/core/testing';
import { UserMockService } from '../../../core/auth/user-mock.service';
import { AppUser } from '../../../shared/models';
import { EditRolesDialogComponent } from './edit-roles-dialog.component';

const editorAdmin: AppUser = {
  id: 'user-3',
  name: 'João Antunes',
  email: 'joao.antunes@dgadr.gov.pt',
  career: 'Chefe de Divisão',
  roles: ['CONTENT_EDITOR', 'ADMIN'],
  status: 'active',
  lastAccess: '2026-07-05',
};

describe('EditRolesDialogComponent', () => {
  let closeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    closeSpy = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: DialogRef, useValue: { close: closeSpy } },
        { provide: DIALOG_DATA, useValue: { user: editorAdmin } },
      ],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('pre-selects the roles the user already has', () => {
    const fixture = TestBed.createComponent(EditRolesDialogComponent);
    fixture.detectChanges();

    const checked = Array.from(
      fixture.nativeElement.querySelectorAll('input[type="checkbox"]:checked'),
    ) as HTMLInputElement[];
    expect(checked).toHaveLength(2);
  });

  it('saves an updated set of roles and closes the dialog with the result', async () => {
    const fixture = TestBed.createComponent(EditRolesDialogComponent);
    fixture.detectChanges();

    const checkboxes = fixture.nativeElement.querySelectorAll(
      'input[type="checkbox"]',
    ) as NodeListOf<HTMLInputElement>;
    checkboxes[2].click(); // SUPPORT_AGENT
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { submit(): void }).submit();
    await vi.advanceTimersByTimeAsync(300);

    expect(closeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ roles: ['CONTENT_EDITOR', 'ADMIN', 'SUPPORT_AGENT'] }),
    );
  });

  it('blocks removing the last ADMIN with an inline message, keeping the dialog open', async () => {
    const userMockService = TestBed.inject(UserMockService);
    // user-3 acumula CONTENT_EDITOR + ADMIN; torná-lo o único administrador para este teste.
    const promise = firstValueFrom(userMockService.assignRoles('user-5', ['CONTENT_EDITOR']));
    await vi.advanceTimersByTimeAsync(300);
    await promise;

    const fixture = TestBed.createComponent(EditRolesDialogComponent);
    fixture.detectChanges();

    const checkboxes = fixture.nativeElement.querySelectorAll(
      'input[type="checkbox"]',
    ) as NodeListOf<HTMLInputElement>;
    const adminCheckbox = Array.from(checkboxes).find(
      (checkbox) => checkbox.checked && checkbox.parentElement?.textContent?.includes('Admin'),
    );
    adminCheckbox?.click();
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { submit(): void }).submit();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(closeSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain(
      'administrador',
    );
  });

  it('closes the dialog without a result when cancelled', () => {
    const fixture = TestBed.createComponent(EditRolesDialogComponent);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { cancel(): void }).cancel();

    expect(closeSpy).toHaveBeenCalledWith(undefined);
  });
});
