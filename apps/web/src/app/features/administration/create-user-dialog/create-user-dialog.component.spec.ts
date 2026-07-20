import { DialogRef } from '@angular/cdk/dialog';
import { TestBed } from '@angular/core/testing';
import { CreateUserDialogComponent } from './create-user-dialog.component';

describe('CreateUserDialogComponent', () => {
  let closeSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    closeSpy = vi.fn();
    TestBed.configureTestingModule({
      providers: [{ provide: DialogRef, useValue: { close: closeSpy } }],
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function fillRequiredFields(fixture: ReturnType<typeof TestBed.createComponent>): void {
    const component = fixture.componentInstance as unknown as CreateUserDialogComponent;
    (component as unknown as { form: { setValue(value: unknown): void } }).form.setValue({
      name: 'Rita Nogueira',
      email: 'rita.nogueira@dgadr.gov.pt',
      career: 'Técnico Superior',
    });
  }

  it('shows a validation message and does not submit when no role is selected', () => {
    const fixture = TestBed.createComponent(CreateUserDialogComponent);
    fillRequiredFields(fixture);
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.requestSubmit();
    fixture.detectChanges();

    expect(closeSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Selecione pelo menos uma função');
  });

  it('creates a user with more than one role and closes the dialog with it', async () => {
    const fixture = TestBed.createComponent(CreateUserDialogComponent);
    fillRequiredFields(fixture);
    fixture.detectChanges();

    const checkboxes = fixture.nativeElement.querySelectorAll(
      'input[type="checkbox"]',
    ) as NodeListOf<HTMLInputElement>;
    checkboxes[0].click();
    checkboxes[2].click();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.requestSubmit();
    await vi.advanceTimersByTimeAsync(300);

    expect(closeSpy).toHaveBeenCalledWith(
      expect.objectContaining({ roles: ['EMPLOYEE', 'SUPPORT_AGENT'] }),
    );
  });

  it('shows an inline error and keeps the dialog open when the e-mail is already taken', async () => {
    const fixture = TestBed.createComponent(CreateUserDialogComponent);
    const component = fixture.componentInstance as unknown as {
      form: { setValue(value: unknown): void };
    };
    component.form.setValue({
      name: 'Duplicado',
      email: 'marta.silva@dgadr.gov.pt',
      career: 'Técnico Superior',
    });
    fixture.detectChanges();

    const checkbox = fixture.nativeElement.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    checkbox.click();
    fixture.detectChanges();

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    form.requestSubmit();
    await vi.advanceTimersByTimeAsync(300);
    fixture.detectChanges();

    expect(closeSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('e-mail');
  });

  it('closes the dialog without a result when cancelled', () => {
    const fixture = TestBed.createComponent(CreateUserDialogComponent);
    fixture.detectChanges();

    (fixture.componentInstance as unknown as { cancel(): void }).cancel();

    expect(closeSpy).toHaveBeenCalledWith(undefined);
  });
});
