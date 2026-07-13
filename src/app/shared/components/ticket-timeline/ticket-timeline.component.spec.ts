import { TestBed } from '@angular/core/testing';
import { TicketTimelineComponent, TicketTimelineEntry } from './ticket-timeline.component';

describe('TicketTimelineComponent', () => {
  const entries: readonly TicketTimelineEntry[] = [
    {
      id: 'msg-1',
      kind: 'message',
      author: 'Marta Silva',
      createdAt: '2026-07-08T09:14:00',
      content: 'Não consigo aceder ao Filedoc.',
    },
    {
      id: 'msg-2',
      kind: 'message',
      author: 'Carlos Vieira',
      authorRole: 'Agente de suporte',
      createdAt: '2026-07-08T10:02:00',
      content: 'Já estamos a verificar a situação.',
      attachments: [{ id: 'att-1', fileName: 'captura-ecra.png' }],
    },
  ];

  it('renders one entry per timeline item, in order', async () => {
    const fixture = TestBed.createComponent(TicketTimelineComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    await fixture.whenStable();
    const items = fixture.nativeElement.querySelectorAll('.fdr-ticket-timeline__entry');
    expect(items.length).toBe(2);
    expect(items[0].textContent).toContain('Não consigo aceder ao Filedoc.');
    expect(items[1].textContent).toContain('Carlos Vieira');
  });

  it('renders the attachments of an entry', async () => {
    const fixture = TestBed.createComponent(TicketTimelineComponent);
    fixture.componentRef.setInput('entries', entries);
    fixture.detectChanges();
    await fixture.whenStable();
    const attachment = fixture.nativeElement.querySelector('.fdr-ticket-timeline__attachment');
    expect(attachment?.textContent).toContain('captura-ecra.png');
  });
});
