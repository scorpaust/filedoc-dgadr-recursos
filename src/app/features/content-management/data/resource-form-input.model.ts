import { Difficulty, DocumentType, ResourceType, Workflow } from '../../../shared/models';

export interface ResourceFormInput {
  readonly title: string;
  readonly slug: string;
  readonly summary: string;
  readonly description: string;
  readonly type: ResourceType;
  readonly workflow: Workflow;
  readonly documentType: DocumentType;
  readonly difficulty: Difficulty;
  readonly tags: readonly string[];
  readonly duration?: string;
  readonly pages?: number;
  readonly videoUrl?: string;
  readonly captionsUrl?: string;
  readonly pdfUrl?: string;
  readonly thumbnailUrl?: string;
  readonly thumbnailAlt?: string;
}
