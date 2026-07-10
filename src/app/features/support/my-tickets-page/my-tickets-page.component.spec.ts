import { TestBed } from '@angular/core/testing';
import { MyTicketsPageComponent } from './my-tickets-page.component';

describe('MyTicketsPageComponent', () => {
  it('renders the screen title', async () => {
    const fixture = TestBed.createComponent(MyTicketsPageComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.nativeElement.textContent).toContain('Suporte');
  });
});
