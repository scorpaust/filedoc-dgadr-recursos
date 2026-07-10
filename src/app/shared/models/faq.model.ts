import { EditorialStatus } from './editorial-status.model';

export interface Faq {
  readonly id: string;
  readonly question: string;
  readonly answer: string;
  readonly status: EditorialStatus;
}
