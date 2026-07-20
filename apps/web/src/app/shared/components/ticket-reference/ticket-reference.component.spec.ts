import { TestBed } from '@angular/core/testing';
import { TicketReferenceComponent } from './ticket-reference.component';

describe('TicketReferenceComponent', () => {
  it('renders the reference label', async () => {
    const fixture = TestBed.createComponent(TicketReferenceComponent);
    fixture.componentRef.setInput('reference', 'SUP-2026-041392');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('SUP-2026-041392');
  });
});
