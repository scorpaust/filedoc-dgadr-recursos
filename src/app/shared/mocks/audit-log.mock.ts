// Dados de demonstração — entradas ilustrativas, não um histórico real de atividade.
// Nunca gerado a partir de ações efetivamente praticadas nas fases anteriores (essa
// instrumentação é responsabilidade do backend, quando a Fase 9 for substituída pela
// integração real — ver fase-9-ui-administracao.md).
import { AuditLogEntry } from '../models';

export const auditLogEntries: readonly AuditLogEntry[] = [
  {
    id: 'audit-1',
    actor: 'Ana Ferreira',
    action: 'atribuiu a função de Administrador a',
    entityType: 'utilizador',
    entityLabel: 'João Antunes',
    createdAt: '2026-07-12T09:15:00',
  },
  {
    id: 'audit-2',
    actor: 'Ana Ferreira',
    action: 'desativou a conta de',
    entityType: 'utilizador',
    entityLabel: 'Paulo Matos',
    createdAt: '2026-07-11T16:40:00',
  },
  {
    id: 'audit-3',
    actor: 'João Antunes',
    action: 'publicou o recurso',
    entityType: 'recurso',
    entityLabel: 'Como criar um novo registo',
    createdAt: '2026-07-11T11:05:00',
  },
  {
    id: 'audit-4',
    actor: 'João Antunes',
    action: 'arquivou o recurso',
    entityType: 'recurso',
    entityLabel: 'Procedimento desatualizado de correspondência',
    createdAt: '2026-07-10T17:22:00',
  },
  {
    id: 'audit-5',
    actor: 'João Antunes',
    action: 'substituiu o ficheiro principal do guia',
    entityType: 'recurso',
    entityLabel: 'Como assinar um documento',
    createdAt: '2026-07-09T14:50:00',
  },
  {
    id: 'audit-6',
    actor: 'Carlos Vieira',
    action: 'marcou como resolvido o pedido',
    entityType: 'pedido de suporte',
    entityLabel: 'SUP-2026-104822',
    createdAt: '2026-07-09T10:30:00',
  },
  {
    id: 'audit-7',
    actor: 'Sofia Ramos',
    action: 'encerrou o pedido',
    entityType: 'pedido de suporte',
    entityLabel: 'SUP-2026-098311',
    createdAt: '2026-07-08T18:05:00',
  },
  {
    id: 'audit-8',
    actor: 'Ana Ferreira',
    action: 'criou a conta de',
    entityType: 'utilizador',
    entityLabel: 'Sofia Ramos',
    createdAt: '2026-07-06T09:00:00',
  },
  {
    id: 'audit-9',
    actor: 'Ana Ferreira',
    action: 'alterou o parâmetro operacional',
    entityType: 'configuração',
    entityLabel: 'Tamanho máximo de anexos por pedido',
    createdAt: '2026-07-05T12:10:00',
  },
];
