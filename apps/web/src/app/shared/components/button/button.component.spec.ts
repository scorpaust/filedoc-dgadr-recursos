import { TestBed } from '@angular/core/testing';
import { ButtonComponent } from './button.component';

describe('ButtonComponent', () => {
  it('applies the variant and size classes', async () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentRef.setInput('variant', 'outline');
    fixture.componentRef.setInput('size', 'sm');
    fixture.detectChanges();
    await fixture.whenStable();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.classList.contains('fdr-button--outline')).toBe(true);
    expect(button.classList.contains('fdr-button--sm')).toBe(true);
  });

  it('emits clicked when pressed', async () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    let clicks = 0;
    fixture.componentInstance.clicked.subscribe(() => clicks++);
    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();
    expect(clicks).toBe(1);
  });

  it('does not emit clicked when disabled', async () => {
    const fixture = TestBed.createComponent(ButtonComponent);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    await fixture.whenStable();
    let clicks = 0;
    fixture.componentInstance.clicked.subscribe(() => clicks++);
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    button.click();
    expect(clicks).toBe(0);
  });
});
