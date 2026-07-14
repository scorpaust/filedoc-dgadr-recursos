import { PillTone } from '../../shared/components/pill/pill.component';
import { UserRole } from '../../shared/models';

// Mapeamento de tom partilhado por toda a área de administração, para que a mesma função
// use sempre a mesma cor de pílula (fase-9-ui-administracao.md, tarefa B).
export const ROLE_PILL_TONES: Record<UserRole, PillTone> = {
  EMPLOYEE: 'neutral',
  CONTENT_EDITOR: 'info',
  SUPPORT_AGENT: 'plum',
  ADMIN: 'warning',
};
