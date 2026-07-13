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

  it('marks internal notes with a distinct modifier class and a visible "Nota interna" label', async () => {
    const withInternalNote: readonly TicketTimelineEntry[] = [
      ...entries,
      {
        id: 'msg-3',
        kind: 'internal-note',
        author: 'Carlos Vieira',
        authorRole: 'Agente de suporte',
        createdAt: '2026-07-08T10:05:00',
        content: 'A verificar junto do administrador de sistemas.',
      },
    ];
    const fixture = TestBed.createComponent(TicketTimelineComponent);
    fixture.componentRef.setInput('entries', withInternalNote);
    fixture.detectChanges();
    await fixture.whenStable();
    const items = fixture.nativeElement.querySelectorAll('.fdr-ticket-timeline__entry');
    const internalNoteEntry = items[2];
    expect(internalNoteEntry.classList).toContain('fdr-ticket-timeline__entry--internal-note');
    expect(internalNoteEntry.textContent).toContain('Nota interna');
  });

  it('does not mark public messages or status changes as internal notes', async () => {
    const withStatusChange: readonly TicketTimelineEntry[] = [
      ...entries,
      {
        id: 'msg-4',
        kind: 'status-change',
        author: 'Carlos Vieira',
        authorRole: 'Agente de suporte',
        createdAt: '2026-07-08T10:10:00',
        content: 'Carlos Vieira alterou o estado para Em tratamento.',
      },
    ];
    const fixture = TestBed.createComponent(TicketTimelineComponent);
    fixture.componentRef.setInput('entries', withStatusChange);
    fixture.detectChanges();
    await fixture.whenStable();
    const items = fixture.nativeElement.querySelectorAll('.fdr-ticket-timeline__entry');
    expect(items[0].textContent).not.toContain('Nota interna');
    expect(items[2].classList).toContain('fdr-ticket-timeline__entry--status-change');
    expect(items[2].classList).not.toContain('fdr-ticket-timeline__entry--internal-note');
  });
});
