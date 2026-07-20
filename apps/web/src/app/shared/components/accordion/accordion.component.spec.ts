import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AccordionComponent } from './accordion.component';
import { AccordionItemComponent } from './accordion-item/accordion-item.component';

@Component({
  imports: [AccordionComponent, AccordionItemComponent],
  template: `
    <fdr-accordion>
      <fdr-accordion-item title="Pergunta 1">Resposta 1</fdr-accordion-item>
      <fdr-accordion-item title="Pergunta 2">Resposta 2</fdr-accordion-item>
    </fdr-accordion>
  `,
})
class HostComponent {}

describe('AccordionComponent', () => {
  it('projects multiple accordion items, each independently toggleable', async () => {
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    const triggers = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    expect(triggers.length).toBe(2);

    triggers[0].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(triggers[0].getAttribute('aria-expanded')).toBe('true');
    expect(triggers[1].getAttribute('aria-expanded')).toBe('false');
  });
});
