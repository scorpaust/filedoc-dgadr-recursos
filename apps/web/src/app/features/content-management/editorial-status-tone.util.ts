import { TagTone } from '../../shared/components/tag/tag.component';
import { EditorialStatus } from '../../shared/models';

// Mapeamento de tom partilhado entre as sub-áreas de gestão de conteúdos (recursos, dicas,
// perguntas frequentes), para que o mesmo estado editorial use sempre a mesma cor.
export const EDITORIAL_STATUS_TONES: Record<EditorialStatus, TagTone> = {
  draft: 'warning',
  published: 'success',
  archived: 'neutral',
};
