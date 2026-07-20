import { EditorialStatus } from './editorial-status.model';

export interface Tip {
  readonly id: string;
  readonly text: string;
  readonly status: EditorialStatus;
  readonly sortOrder: number;
}
