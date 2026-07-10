import { OverlayContainer } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { DropdownFilterComponent } from './dropdown-filter.component';

describe('DropdownFilterComponent', () => {
  let overlayContainer: OverlayContainer;

  const options = [
    { value: 'criacao', label: 'Criação e registo' },
    { value: 'assinatura', label: 'Assinatura' },
  ];

  beforeEach(() => {
    TestBed.configureTestingModule({});
    overlayContainer = TestBed.inject(OverlayContainer);
  });

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  it('shows the selected-count badge only when there is a selection', async () => {
    const fixture = TestBed.createComponent(DropdownFilterComponent);
    fixture.componentRef.setInput('label', 'Fluxo');
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.querySelector('.fdr-dropdown-filter__count')).toBeNull();

    fixture.componentRef.setInput('selectedValues', ['criacao']);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(
      fixture.nativeElement.querySelector('.fdr-dropdown-filter__count')?.textContent?.trim(),
    ).toBe('1');
  });

  it('opens the options panel on click and closes it again', async () => {
    const fixture = TestBed.createComponent(DropdownFilterComponent);
    fixture.componentRef.setInput('label', 'Fluxo');
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
    await fixture.whenStable();

    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(
      overlayContainer.getContainerElement().querySelector('.fdr-dropdown-filter__panel'),
    ).toBeTruthy();

    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('toggles an option value when its checkbox changes', async () => {
    const fixture = TestBed.createComponent(DropdownFilterComponent);
    fixture.componentRef.setInput('label', 'Fluxo');
    fixture.componentRef.setInput('options', options);
    fixture.detectChanges();
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    fixture.detectChanges();
    await fixture.whenStable();

    const checkbox = overlayContainer
      .getContainerElement()
      .querySelector('input[type="checkbox"]') as HTMLInputElement;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();

    expect(fixture.componentInstance.selectedValues()).toEqual(['criacao']);
  });
});
