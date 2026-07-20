import { TestBed } from '@angular/core/testing';
import { AccordionItemComponent } from './accordion-item.component';

describe('AccordionItemComponent', () => {
  it('starts collapsed and toggles via the trigger button', async () => {
    const fixture = TestBed.createComponent(AccordionItemComponent);
    fixture.componentRef.setInput('title', 'Quando devo abrir um pedido de suporte?');
    fixture.detectChanges();
    await fixture.whenStable();

    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const content = fixture.nativeElement.querySelector('[role="region"]') as HTMLElement;
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(content.hasAttribute('inert')).toBe(true);

    trigger.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(content.hasAttribute('inert')).toBe(false);
  });

  it('links the trigger and the content region via aria attributes', async () => {
    const fixture = TestBed.createComponent(AccordionItemComponent);
    fixture.componentRef.setInput('title', 'Como posso localizar um processo antigo?');
    fixture.detectChanges();
    await fixture.whenStable();
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const content = fixture.nativeElement.querySelector('[role="region"]') as HTMLElement;
    expect(trigger.getAttribute('aria-controls')).toBe(content.id);
    expect(content.getAttribute('aria-labelledby')).toBe(trigger.id);
  });
});
