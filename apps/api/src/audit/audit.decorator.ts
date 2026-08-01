import { SetMetadata } from '@nestjs/common';

export const AUDIT_METADATA_KEY = 'audit';

export interface AuditMetadata {
  readonly action: string;
  readonly entityType: string;
  // Lista branca de campos do corpo do pedido a incluir nos metadados da entrada de
  // auditoria — nunca todo o corpo (fase-8-integracao-administracao.md, tarefa B: "metadados
  // estritamente necessários", "nunca palavras-passe, tokens ou conteúdo integral").
  readonly metadataKeys?: readonly string[];
}

export function Audit(
  action: string,
  entityType: string,
  options?: { readonly metadataKeys?: readonly string[] },
): MethodDecorator {
  const metadata: AuditMetadata = {
    action,
    entityType,
    metadataKeys: options?.metadataKeys,
  };
  return SetMetadata(AUDIT_METADATA_KEY, metadata);
}
