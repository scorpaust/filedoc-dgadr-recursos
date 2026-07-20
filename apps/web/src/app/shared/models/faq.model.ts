import { EditorialStatus } from './editorial-status.model';

export interface Faq {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly category?: string;
  readonly status: EditorialStatus;
  readonly sortOrder: number;
}
