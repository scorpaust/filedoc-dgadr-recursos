import { EditorialStatus } from './editorial-status.model';

export type ResourceType = 'video' | 'guide';
export type Difficulty = 'iniciacao' | 'intermedia' | 'avancada';

export interface Resource {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly type: ResourceType;
  readonly workflow: string;
  readonly documentType: string;
  readonly difficulty: Difficulty;
  readonly duration?: string;
  readonly pages?: number;
  readonly updatedAt: string;
  readonly status: EditorialStatus;
  readonly author: string;
  readonly relatedResourceIds: readonly string[];
}
