# Fase 7 (Integração) — Gestão de Conteúdos (Área Editorial)

Via de Integração de Funcionalidades. Assume concluídas a Fase 2 (Armazenamento) e a Fase 3 (Catálogo), cujos módulos esta fase estende com as operações de escrita.

Coerente com `project-spec.md` (secções B e N), `coding-standards.md`, `ai-interaction.md`.

---

## Objetivo

Substituir as extensões de escrita dos serviços mock (Fase 8 da via de UI: recursos, dicas, FAQ, taxonomias) por consumo real: criar, editar, duplicar, publicar, despublicar, arquivar recursos; gerir dicas e FAQ; gerir taxonomias com bloqueio real de eliminação quando associadas a recursos (já garantido ao nível do schema na Fase 1 da via de BD, agora com tradução de erro amigável na API); upload real de vídeo, PDF e miniatura via `StorageService`.

---

## Âmbito

**Incluído**: endpoints de escrita em `resources/`, `tips/`, `faqs/`, `taxonomies/`; fluxo de upload real (obter URL de upload do `StorageService`, cliente carrega diretamente, API confirma e associa); validação de publicação (todos os campos obrigatórios preenchidos); proteção por `RolesGuard` (`CONTENT_EDITOR`, `ADMIN`).

**Fora de âmbito**: administração de utilizadores (Fase 8).

---

## Tarefas

### A. Endpoints de recursos (escrita)

- `POST /content/resources`, `PATCH /content/resources/:id`, `POST /content/resources/:id/duplicate`, `POST /content/resources/:id/publish`, `POST /content/resources/:id/unpublish`, `POST /content/resources/:id/archive`;
- `publish` valida todos os campos obrigatórios de `project-spec.md`, secção N — falha com `VALIDATION_ERROR` e `fieldErrors` claros se algum faltar;
- `PATCH` de rascunho tem validação mínima (não exige os campos de publicação).

### B. Upload real

- `POST /content/resources/:id/upload-url` (vídeo/PDF/miniatura): chama `StorageService.createUploadUrl`, devolve o URL ao cliente;
- Após o upload direto ao armazenamento (S3/AWS), o cliente confirma; a API chama `confirmUpload` e só então atualiza o recurso com a nova `fileObjectKey`;
- Substituição de ficheiro: o objeto anterior é agendado para limpeza pela rotina de órfãos (Fase 2), nunca eliminado de forma síncrona e bloqueante do pedido.

### C. Taxonomias

- `DELETE /content/taxonomies/:type/:id`: tenta eliminar; se o Prisma devolver violação de restrição (`Restrict`, já garantido na Fase 1 da via de BD), a API traduz para um erro `VALIDATION_ERROR` com mensagem clara ("Não é possível eliminar; existem recursos associados."), nunca um erro de base de dados cru (conforme `coding-standards.md`).

### D. Dicas e FAQ (escrita)

- CRUD equivalente ao dos recursos, incluindo reordenação (`sortOrder`), com endpoint dedicado para reordenar em lote, para suportar a interação "subir"/"descer" já construída na via de UI.

### E. Ligação da via de UI e testes

- Substituir as extensões mock, preservando a interface da Fase 8 da via de UI;
- Testes de integração: publicação bloqueada por campos em falta, eliminação de taxonomia em uso bloqueada com mensagem clara, upload real de ponta a ponta (contra MinIO em CI, S3/AWS em homologação).

---

## Critérios de aceitação

- [ ] Um utilizador sem `CONTENT_EDITOR`/`ADMIN` é bloqueado em todos os endpoints de gestão de conteúdos;
- [ ] Publicar um recurso sem campos obrigatórios falha com erros claros por campo;
- [ ] Eliminar uma taxonomia em uso falha com mensagem clara, nunca com um erro técnico exposto;
- [ ] Upload real de vídeo/PDF/miniatura funciona de ponta a ponta, sem bytes a passar pela API;
- [ ] Testes de integração e E2E passam.

---

## Comandos de validação

```text
lint
format:check
typecheck
test
test:integration
```

---

## Dependência para a fase seguinte

A Fase 8 (Administração e Auditoria) é independente do conteúdo editorial, mas introduz o registo de auditoria que, idealmente, também passa a cobrir as ações desta fase (publicação, arquivo) — a revisitar nessa fase.

---

> Fase 7 (Integração) — a área editorial é onde o portal ganha conteúdo real; esta fase garante que nada publicado escapa às validações já desenhadas desde a primeira especificação.
