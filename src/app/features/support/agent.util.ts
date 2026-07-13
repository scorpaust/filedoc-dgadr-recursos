import { AppUser } from '../../shared/models';
import { users } from '../../shared/mocks/users.mock';

// Utilizadores mock com função de agente de suporte, para os controlos de
// atribuição/reatribuição da vista de agente (Fase 7 — UI).
export const SUPPORT_AGENTS: readonly AppUser[] = users.filter(
  (user) => user.role === 'SUPPORT_AGENT' && user.status === 'active',
);

export function agentName(agentId: string | undefined): string | undefined {
  return SUPPORT_AGENTS.find((agent) => agent.id === agentId)?.name;
}
