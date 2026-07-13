import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TicketAttachment } from '../../models';
import { IconComponent } from '../icon/icon.component';
import { TagComponent } from '../tag/tag.component';

// "internal-note" acrescentado pela Fase 7 (vista de agente) — a forma da entrada
// não mudou, tal como previsto na Fase 6.
export type TicketTimelineEntryKind = 'message' | 'status-change' | 'internal-note';

export interface TicketTimelineEntry {
  readonly id: string;
  readonly kind: TicketTimelineEntryKind;
  readonly author: string;
  readonly authorRole?: string;
  readonly createdAt: string;
  readonly content: string;
  readonly attachments?: readonly TicketAttachment[];
}

function formatEntryDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-PT', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(iso));
}

@Component({
  selector: 'fdr-ticket-timeline',
  imports: [IconComponent, TagComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './ticket-timeline.component.html',
  styleUrl: './ticket-timeline.component.scss',
})
export class TicketTimelineComponent {
  readonly entries = input.required<readonly TicketTimelineEntry[]>();

  protected formatDate(iso: string): string {
    return formatEntryDate(iso);
  }
}
