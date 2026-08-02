# Privacidade e RGPD

Documenta, conforme exigido por `context/project-spec.md` ("Privacidade e
RGPD", "A documentar durante o desenvolvimento") e concluído na Fase 10
(Integração, Hardening): dados guardados, finalidade, utilizadores com
acesso, política de retenção, tratamento de ficheiros, tratamento de logs e
processo de eliminação. Inventário construído a partir do schema real da
base de dados (`apps/api/prisma/schema.prisma`), não de uma suposição.

## Dados guardados e finalidade

| Dado | Modelo | Finalidade | Acesso |
|---|---|---|---|
| Nome, e-mail, hash de palavra-passe, estado (ativo/inativo), última sessão | `User` | Autenticação e identificação do trabalhador no sistema | O próprio (nome/e-mail via sessão); `ADMIN` (gestão de utilizadores) |
| Papéis (`EMPLOYEE`/`SUPPORT_AGENT`/`CONTENT_EDITOR`/`ADMIN`) | `UserRole` | Autorização por função | `ADMIN` |
| Sessão (hash do token, validade, revogação) | `Session` | Manter a sessão autenticada, permitir logout remoto/revogação | Só a própria API (nunca exposto num endpoint de leitura) |
| Assunto, descrição, categoria, prioridade, estado de um pedido de suporte | `SupportTicket` | Gerir pedidos de apoio dos trabalhadores | O próprio requerente; o agente atribuído (ou disponível); `ADMIN` (ver `docs/auditoria-seguranca-fase-10.md`, "Autorização por recurso") |
| Mensagens de um pedido (incl. notas internas) | `TicketMessage` | Comunicação entre trabalhador e agente de suporte | Idem, exceto notas internas (`INTERNAL`), nunca visíveis ao requerente |
| Anexos de um pedido (nome original, tipo, tamanho, referência ao objeto) | `TicketAttachment` | Comprovativos/capturas de ecrã associados a um pedido | Idem `SupportTicket` |
| Ação de auditoria, ator, entidade afetada, metadados explicitamente permitidos | `AuditLog` | Rastreabilidade de ações administrativas sensíveis | `ADMIN` |

Não são recolhidos: dados de pagamento (pagamentos excluídos do projeto, ver
"Regras obrigatórias do projeto"), dados de localização, nem qualquer campo
sem uma finalidade correspondente nesta tabela — confirmado por leitura
integral do schema, não apenas dos ecrãs.

## Limitação da finalidade e minimização

Cada campo do schema tem uma finalidade funcional direta (autenticação,
gestão de pedidos, auditoria). Não existe nenhum campo de perfil, preferência
ou comportamento recolhido "para uso futuro" sem uma funcionalidade que o
consuma hoje.

## Controlo de acesso

Aplicado exclusivamente no backend (nunca confiado ao frontend), por
`AuthGuard`/`RolesGuard` e por verificações de propriedade no serviço — ver
`docs/auditoria-seguranca-fase-10.md`, secções "Autorização por função e por
recurso". Em particular: um trabalhador só acede aos próprios pedidos de
suporte; um agente só aos pedidos que lhe estão atribuídos ou disponíveis
(exceto `ADMIN`, com supervisão transversal).

## Retenção

Prazo institucional **ainda não confirmado pela DGADR** — conforme
`project-spec.md`, "Não é definido, nesta especificação, um prazo
institucional de retenção definitivo sem validação prévia pela DGADR." A
variável `RETENTION_POLICY_DAYS` (`apps/api/.env.example`) existe e é
validada pela API desde esta fase (número de dias positivo, se definida),
mas fica por omissão por definir — nenhum valor foi inventado.

**Processo de aplicação, manual nesta fase** (conforme o texto da própria
especificação da Fase 10, "mesmo que manual"): quando a DGADR confirmar um
prazo,
1. definir `RETENTION_POLICY_DAYS` no ambiente (`.env`/`.env.homolog`);
2. identificar os pedidos de suporte fechados (`SupportTicket.closedAt`) há
   mais dias do que o prazo definido;
3. para cada um, remover os objetos associados no armazenamento
   (`TicketAttachment.objectKey`, via `StorageService`) antes de eliminar os
   registos da base de dados (`TicketAttachment` → `TicketMessage` →
   `SupportTicket`, respeitando as `onDelete: Cascade` já definidas no
   schema — eliminar o ticket já elimina mensagens e anexos em cascata);
4. registar a execução (quantos registos, que intervalo de datas) fora do
   `AuditLog` operacional, num relatório de execução manual, até existir um
   automatismo (fora do âmbito do MVP — ver "retenção avançada" em
   `project-spec.md`, "Segunda Fase e Evolução Futura").

Este processo é deliberadamente manual: automatizar a purga antes de existir
um prazo institucional confirmado arriscaria eliminar dados que a DGADR
ainda pretenda reter.

## Eliminação controlada

Um `ADMIN` pode desativar (não eliminar) um utilizador
(`POST /users/:id/deactivate`) — histórico de pedidos/mensagens/anexos
mantém-se intacto e rastreável, consistente com a necessidade de auditoria.
Eliminação definitiva de dados de um utilizador seria, tal como a retenção,
um processo manual e institucional, ainda sem prazo definido.

## Tratamento de ficheiros

Anexos de tickets e ficheiros de recursos (vídeo, PDF, miniatura, legendas)
nunca são guardados no PostgreSQL — só a referência ao objeto
(`objectKey`) é persistida; o ficheiro em si vive num armazenamento
compatível com S3 (MinIO em desenvolvimento/homologação local; S3/European
Sovereign Cloud em produção, ainda por confirmar institucionalmente — ver
`docs/preparacao-producao-aws.md`), sempre em bucket privado, acedido só por
URLs pré-assinados e temporários (ver `docs/auditoria-seguranca-fase-10.md`,
"Armazenamento privado / URLs temporários").

## Tratamento de logs

Logs da aplicação (`Logger` do NestJS) contêm apenas mensagens técnicas
genéricas e identificadores (chave de objeto, id de correlação) — nunca
passwords, tokens de sessão em claro, nem o corpo completo de um pedido HTTP
(confirmado por amostragem do código nesta fase, ver
`docs/auditoria-seguranca-fase-10.md`, "Logs sem informação sensível"). O
`AuditLog` (tabela da base de dados, distinto dos logs de aplicação) regista
ações administrativas sensíveis com uma lista explícita de metadados
permitidos por ação, nunca o corpo completo do pedido.

## Transparência

Este documento, mais `docs/auditoria-seguranca-fase-10.md` e
`context/project-spec.md`, constituem o registo público (dentro da
organização) do tratamento de dados desta aplicação — atualizado sempre que
uma fase futura (Segunda Fase, Evolução Futura) alterar o que é recolhido.

## Ausência de rastreamento externo

✅ Confirmado nesta fase: nenhuma dependência de analítica, publicidade ou
rastreamento (Google Analytics ou equivalente) em `apps/web/package.json`
nem `apps/api/package.json`; nenhuma chamada de rede a um domínio de
terceiros a partir do frontend fora do próprio backend da aplicação.

## Processo de exportação

Não implementado nesta fase — `project-spec.md` classifica-o como "quando
legalmente aplicável", sem uma exigência confirmada pela DGADR até ao
fecho do MVP. Fica registado como dependência institucional em aberto, a
retomar se e quando a DGADR o exigir formalmente.
