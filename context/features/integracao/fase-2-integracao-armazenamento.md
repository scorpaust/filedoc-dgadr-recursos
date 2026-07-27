# Fase 2 (Integração) — Armazenamento de Ficheiros

Esta especificação define a **segunda fase da via de Integração de Funcionalidades** do **Filedoc Recursos Formativos** — a via que liga, funcionalidade a funcionalidade, cada serviço mock da via de UI ao respetivo consumo real da API NestJS.

Assume como ponto de partida a Fase 1 (Integração) — Autenticação e Autorização, já concluída, e a via de Base de Dados e Deployment Inicial completa (Fases 1–5), incluindo a decisão tomada na Fase 5 sobre onde o armazenamento de objetos está alojado (MinIO autoalojado, Amazon S3 numa região UE, ou AWS European Sovereign Cloud).

Esta fase é colocada cedo na via de Integração porque as Fases 3 (Catálogo e Detalhe de recursos), 5 (Suporte) e 7 (Gestão de conteúdos) dependem todas de ficheiros reais — resolver o armazenamento uma vez, aqui, evita implementar o mesmo mecanismo três vezes.

Coerente com `project-spec.md` (secções D, E e K — Vídeos, Guias em PDF, Anexos de suporte), `coding-standards.md` (secção "Armazenamento de ficheiros") e `ai-interaction.md`.

---

## Objetivo

No final desta fase, deve existir, na API NestJS, um módulo de armazenamento (`storage/`) capaz de:

- gerar URLs pré-assinados de **upload** (`PUT`) para vídeos, PDFs, miniaturas e anexos de ticket, validados quanto a extensão, tipo MIME e tamanho máximo antes de o URL ser emitido;
- gerar URLs pré-assinados de **download/streaming** (`GET`) para os mesmos tipos de ficheiro, com suporte a pedidos `Range` (necessário para o leitor de vídeo poder avançar/recuar sem descarregar o ficheiro completo);
- nunca fazer transitar os bytes do ficheiro pelo próprio processo NestJS — o browser fala diretamente com o armazenamento de objetos (MinIO em desenvolvimento, o serviço escolhido na Fase 5 em homologação/produção), usando apenas o URL pré-assinado emitido pela API;
- gerar nomes de objeto não previsíveis, preservando o nome original apenas como metadado na base de dados (`fileObjectKey` vs. `originalName`, já modelados na via de BD);
- confirmar que **nenhum objeto é acessível sem passar pela emissão de um URL pré-assinado autorizado** — os *buckets* permanecem privados, tal como já configurado na Fase 5.

Não existe nesta fase: a integração de nenhuma funcionalidade concreta (Catálogo, Suporte, Conteúdos) — apenas o módulo de armazenamento reutilizável que essas fases seguintes vão consumir.

---

## Âmbito

### Incluído

- Módulo `storage/` na API, com um serviço que encapsula o SDK do armazenamento escolhido (compatível com S3, cobrindo tanto MinIO como AWS S3, sem código específico de um fornecedor);
- Geração de URLs pré-assinados de upload, com validação prévia de extensão/tipo MIME/tamanho antes da emissão;
- Geração de URLs pré-assinados de download/streaming, com suporte a `Range`;
- *Multipart upload* para ficheiros acima de um limiar configurável (indicativo: 100 MB), mais fiável do que um único `PUT` em redes instáveis;
- Confirmação, após o upload, de que o objeto foi efetivamente escrito no armazenamento antes de a base de dados ser atualizada com a referência (evitar referências "órfãs" para ficheiros que nunca chegaram a ser carregados);
- Eliminação de objetos órfãos (upload iniciado mas nunca associado a um recurso/ticket publicado, ou substituído por uma nova versão);
- Validação de tipo MIME real do ficheiro (não apenas a extensão ou o `Content-Type` declarado pelo cliente), na medida do tecnicamente possível no fluxo de URL pré-assinado (ver riscos);
- Configuração dos limites (tamanho máximo, extensões permitidas, número máximo de anexos) através das variáveis de ambiente já previstas em `project-spec.md` (`MAX_UPLOAD_SIZE`, `MAX_ATTACHMENTS_PER_TICKET`).

### Fora de âmbito

- Qualquer ecrã ou fluxo de negócio concreto que use este módulo (Fases 3, 5 e 7 desta via);
- Processamento de vídeo (compressão, geração automática de miniaturas, transcodificação) — não previsto em `project-spec.md`;
- CDN dedicada (ex.: CloudFront) — o MVP funciona diretamente sobre URLs pré-assinados do armazenamento de objetos; uma CDN pode ser considerada mais tarde, se o volume de acessos o justificar, mas não é um requisito desta fase;
- Streaming adaptativo (HLS/DASH) — fora do âmbito do MVP; o vídeo é servido como ficheiro único progressivo, suficiente para o volume e o perfil de utilização previstos.

---

## Entregáveis

1. Módulo `storage/` completo, testado, reutilizável pelas fases seguintes;
2. Documentação dos limites configuráveis e do seu significado;
3. Confirmação prática de que o *streaming* de vídeo com `Range` funciona (avançar/recuar sem descarregar o ficheiro completo);
4. Job ou rotina de limpeza de objetos órfãos.

---

## Tarefas

### A. Serviço de armazenamento

- `StorageService` com métodos:
  - `createUploadUrl(input: { fileName, mimeType, sizeBytes, context })`: valida extensão/MIME/tamanho contra a configuração, gera uma chave de objeto não previsível, devolve o URL pré-assinado de `PUT` e a chave gerada;
  - `createDownloadUrl(objectKey, expiresInSeconds?)`: devolve um URL pré-assinado de `GET`, com suporte a `Range` preservado;
  - `deleteObject(objectKey)`: elimina um objeto (usado na limpeza de órfãos e na substituição de ficheiros);
  - `confirmUpload(objectKey)` (ou equivalente): confirma que o objeto existe efetivamente no armazenamento antes de a entidade de negócio (recurso, anexo) ser marcada como completa;
- Implementação sobre o SDK compatível com S3 (funciona identicamente contra MinIO ou AWS S3, apenas a configuração de endpoint/credenciais muda, conforme decidido na Fase 5 da via de Deployment);
- Testes unitários com o SDK mockado: validação de extensão/MIME/tamanho, geração de chave não previsível, rejeição de ficheiros fora dos limites configurados.

### B. Validação de upload

- Extensões permitidas configuráveis por tipo de contexto (vídeo, PDF, miniatura, anexo de ticket), conforme `project-spec.md`;
- Tamanho máximo configurável via `MAX_UPLOAD_SIZE` (e um limite específico para anexos de ticket, via `MAX_ATTACHMENTS_PER_TICKET` para a contagem, e um tamanho próprio se `project-spec.md` o vier a detalhar mais);
- Bloqueio explícito de extensões executáveis, independentemente do `Content-Type` declarado;
- Validação de tipo MIME real do ficheiro já carregado (ex.: verificação de assinatura/magic bytes), correndo como um passo assíncrono pós-upload sempre que o fluxo de URL pré-assinado não permitir inspeção prévia ao conteúdo — nesse caso, o objeto é removido automaticamente se a validação pós-upload falhar, e a operação de negócio associada (ex.: publicar recurso) fica bloqueada até isso ser resolvido.

### C. *Streaming* de vídeo

- Confirmar, com um teste de integração real (não mock), que um URL de download pré-assinado responde corretamente a um pedido `Range` (ex.: `Range: bytes=0-1023`) com o código de estado e os cabeçalhos esperados (`206 Partial Content`, `Content-Range`);
- Confirmar que o leitor de vídeo construído na via de UI (Fase 4 da via de UI) funciona sem alterações contra este mecanismo — o contrato já validado nos mocks (um URL de onde o `<video>` lê bytes) mantém-se, apenas deixa de ser um ficheiro local de demonstração.

### D. *Multipart upload*

- Para ficheiros acima do limiar configurável, usar *multipart upload* do SDK compatível com S3;
- Gerir a conclusão/abandono do *multipart upload* de forma que uploads incompletos não fiquem a ocupar espaço indefinidamente (política de expiração de uploads incompletos, configurável ao nível do *bucket*, tipicamente suportada nativamente pelo armazenamento compatível com S3).

### E. Limpeza de objetos órfãos

- Rotina (job agendado, ou verificação no momento de eliminação/substituição de um recurso/anexo) que identifica e remove objetos no armazenamento sem referência ativa na base de dados;
- Nunca eliminar um objeto referenciado, mesmo que o recurso associado esteja arquivado (arquivado não é eliminado, conforme `project-spec.md`).

---

## Critérios de aceitação

- [ ] `createUploadUrl` rejeita corretamente extensões não permitidas, tipos MIME não permitidos e ficheiros acima do tamanho máximo configurado, antes de emitir qualquer URL;
- [ ] `createDownloadUrl` gera URLs que respondem corretamente a pedidos `Range`, confirmado com um teste de integração real contra o armazenamento (MinIO local, nesta fase);
- [ ] Nenhum byte de ficheiro transita pelo processo NestJS em nenhum fluxo de upload ou download;
- [ ] As chaves de objeto geradas não são previsíveis (não sequenciais, não derivadas diretamente do nome original);
- [ ] Um ficheiro cujo tipo MIME real não corresponde ao declarado é identificado e o objeto é removido automaticamente;
- [ ] Uploads acima do limiar configurado usam *multipart upload* e recuperam corretamente de uma falha de rede a meio (testável simulando uma interrupção);
- [ ] A rotina de limpeza de objetos órfãos remove corretamente ficheiros sem referência ativa, sem nunca remover ficheiros de recursos arquivados;
- [ ] O leitor de vídeo da via de UI funciona sem alterações contra este mecanismo real;
- [ ] O módulo funciona identicamente contra MinIO (desenvolvimento) e contra o armazenamento real escolhido na Fase 5 da via de Deployment, sem alterações de código, apenas de configuração;
- [ ] Testes unitários e de integração deste módulo passam.

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

## Riscos e decisões em aberto

- A validação de tipo MIME real *antes* da emissão do URL pré-assinado não é possível no padrão de upload direto ao armazenamento (a API nunca vê os bytes) — esta fase assume validação **pós-upload**, com remoção automática em caso de falha; confirmar que esta janela de tempo (ficheiro momentaneamente no armazenamento antes da validação) não representa um risco inaceitável, dado que o *bucket* é privado e o objeto só é acessível via URL assinado que a própria API controla;
- Confirmar o limiar exato a partir do qual se usa *multipart upload* (valor indicativo: 100 MB) — testar com ficheiros de vídeo reais de diferentes tamanhos antes de fixar o valor definitivo;
- Confirmar a duração de expiração dos URLs pré-assinados de download, equilibrando: tempo suficiente para uma sessão de visualização razoável, sem ficar tão longo que represente um risco de partilha indevida do URL — não fixar aqui um valor definitivo sem testar com o comportamento real do leitor de vídeo da via de UI, que pode reemitir o pedido do URL sempre que a página é recarregada.

---

## Dependência para a fase seguinte

A **Fase 3 (Integração) — Catálogo e Detalhe de Recursos** assume como ponto de partida:

- o `StorageService` completo e testado, pronto a ser consumido pelos endpoints de recursos para emitir URLs de upload (gestão de conteúdos, mais adiante) e de download/streaming (consulta pública, já nesta fase seguinte).

---

> Fase 2 (Integração) — resolver o armazenamento uma vez, bem, poupa a repetir a mesma decisão (e os mesmos erros) em três fases diferentes mais à frente.
