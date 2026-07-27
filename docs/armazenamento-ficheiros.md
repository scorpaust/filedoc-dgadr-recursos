# Armazenamento de ficheiros (Fase 2, Integração)

Documenta o módulo `storage/` (`apps/api/src/storage/`) introduzido por
`context/features/integracao/fase-2-integracao-armazenamento.md`: um `StorageService`
reutilizável, sobre um SDK compatível com S3, que emite URLs pré-assinados para upload e
download/streaming de vídeos, PDFs, miniaturas e anexos de ticket — sem que os bytes do
ficheiro alguma vez transitem pelo processo da API. Não integra ainda nenhuma
funcionalidade concreta (isso é trabalho das fases seguintes da via de Integração); só
disponibiliza a mecânica reutilizável.

## Como funciona

1. O consumidor (uma fase futura) chama `StorageService.createUploadUrl({ fileName,
   mimeType, sizeBytes, context })`. O `context` é um de `video`, `pdfGuide`,
   `thumbnail` ou `ticketAttachment` — cada um com a sua própria lista de
   extensões/tipos MIME permitidos (`storage.constants.ts`).
2. O pedido é validado (extensão, tipo MIME, tamanho, bloqueio de executáveis) **antes**
   de qualquer URL ser emitido. Uma violação lança `BadRequestException` sem chamar o
   armazenamento.
3. É gerada uma chave de objeto não previsível (`object-key.util.ts`, `crypto.
   randomBytes`) — nunca derivada do nome original nem sequencial. O nome original só
   deve ser guardado como metadado pelo domínio consumidor (ex. `TicketAttachment.
   originalName`, já modelado na via de Base de Dados).
4. Ficheiros até `STORAGE_MULTIPART_THRESHOLD_BYTES` recebem um único URL pré-assinado
   de `PUT`. Acima do limiar, é iniciado um *multipart upload*: o serviço devolve um
   `uploadId` e um URL pré-assinado de `UploadPart` por parte: o cliente carrega cada
   parte diretamente para o armazenamento e o consumidor chama
   `completeMultipartUpload`/`abortMultipartUpload` conforme o resultado.
5. Depois do upload, o consumidor deve chamar `confirmUpload(objectKey)` (confirma que o
   objeto foi mesmo escrito, antes de gravar a referência na base de dados) e, como
   passo assíncrono seguinte, `validateUploadedFileSignature(objectKey, mimeType)`
   (confirma a assinatura real do ficheiro — "magic bytes" — contra o tipo declarado; se
   não corresponder, o objeto é removido automaticamente).
6. Para consulta/streaming, `createDownloadUrl(objectKey)` devolve um URL pré-assinado
   de `GET` — o suporte a pedidos `Range` (necessário para o leitor de vídeo avançar/
   recuar sem descarregar o ficheiro completo) é uma propriedade do próprio protocolo
   S3/MinIO, não algo que a API precise de implementar.
7. `OrphanCleanupService.cleanupOrphanObjects()` remove objetos no armazenamento sem
   nenhuma referência ativa (`Resource.fileObjectKey`/`thumbnailObjectKey`/
   `captionObjectKey`, `TicketAttachment.objectKey`) — nunca um objeto arquivado, já que
   arquivar não é eliminar. Executável via `npm run storage:cleanup-orphans --workspace
   apps/api`; agendar a sua execução periódica é uma decisão de infraestrutura do
   anfitrião (mesmo princípio já aplicado a `scripts/homolog/backup-postgres.sh`).

## Limites configuráveis

Todas as variáveis abaixo são lidas e validadas no arranque (`apps/api/src/config/
env.validation.ts`) — a aplicação não arranca com um valor inválido. Ver
`apps/api/.env.example` para os valores de desenvolvimento.

| Variável | Significado | Omissão |
| --- | --- | --- |
| `STORAGE_ENDPOINT` | Endereço do armazenamento compatível com S3 (MinIO local ou o serviço real escolhido na Fase 5, Deployment). | obrigatória |
| `STORAGE_BUCKET` | Nome do *bucket* privado usado por esta aplicação. Criado automaticamente no arranque se ainda não existir (falha silenciosa e apenas registada em produção, onde a permissão de criar *buckets* tipicamente não é concedida à aplicação). | obrigatória |
| `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY` | Credenciais do armazenamento. Nunca colocadas no frontend nem em logs. | obrigatórias |
| `STORAGE_REGION` | Exigida pelo SDK; ignorada pelo MinIO. | `us-east-1` |
| `STORAGE_FORCE_PATH_STYLE` | `true` para MinIO ou qualquer S3 acedido por endereço direto; `false` só quando o armazenamento exigir o formato de subdomínio por *bucket* (ex. Amazon S3 real). | `true` |
| `MAX_UPLOAD_SIZE` | Tamanho máximo, em bytes, de um único ficheiro carregado — aplica-se a todos os contextos (vídeo, PDF, miniatura, anexo de ticket); `project-spec.md` só prevê um limite global. | 500 MB |
| `MAX_ATTACHMENTS_PER_TICKET` | Número máximo de anexos por ticket de suporte (contagem — a validação em si é responsabilidade do domínio de Suporte, numa fase seguinte). | 5 |
| `STORAGE_MULTIPART_THRESHOLD_BYTES` | Ficheiros acima deste tamanho usam *multipart upload*. Valor indicativo — a confirmar com ficheiros de vídeo reais antes de fixar em definitivo (ver riscos em aberto da especificação). | 100 MB |
| `STORAGE_MULTIPART_PART_SIZE_BYTES` | Tamanho de cada parte de um *multipart upload*. O protocolo S3 exige um mínimo de 5 MB por parte, exceto a última. | 10 MB |
| `STORAGE_UPLOAD_URL_TTL_SECONDS` | Validade de um URL pré-assinado de upload. | 15 minutos |
| `STORAGE_DOWNLOAD_URL_TTL_SECONDS` | Validade de um URL pré-assinado de download/streaming — ainda por confirmar em definitivo contra o comportamento real do leitor de vídeo da via de UI (ver riscos em aberto da especificação). | 1 hora |
| `STORAGE_ORPHAN_GRACE_PERIOD_SECONDS` | Idade mínima que um objeto sem referência ativa tem de ter antes de ser considerado órfão — evita apagar um upload recente ainda não associado a uma entidade de negócio. | 24 horas |

## Extensões e tipos MIME permitidos por contexto

Definidos em `apps/api/src/storage/storage.constants.ts`. Extensões executáveis
(`.exe`, `.bat`, `.cmd`, `.sh`, `.ps1`, `.dll`, `.jar`, …) são sempre bloqueadas,
independentemente do contexto ou do `Content-Type` declarado.

| Contexto | Extensões | Tipos MIME |
| --- | --- | --- |
| `video` | `.mp4`, `.webm` | `video/mp4`, `video/webm` |
| `pdfGuide` | `.pdf` | `application/pdf` |
| `thumbnail` | `.jpg`, `.jpeg`, `.png`, `.webp` | `image/jpeg`, `image/png`, `image/webp` |
| `ticketAttachment` | `.pdf`, `.jpg`, `.jpeg`, `.png`, `.webp`, `.docx`, `.xlsx`, `.txt` | os anteriores + tipos OOXML do Word/Excel + `text/plain` |

## Ambientes de armazenamento

- **Desenvolvimento**: `docker compose up -d` sobe também o serviço `minio` (portas
  `9000`/`9001`, consola em `http://localhost:9001`, credenciais em `docker-compose.
  yml`).
- **Testes de integração**: `docker compose --profile test up -d minio-test`, isolado
  do MinIO de desenvolvimento (portas `9002`/`9003`), sem volume persistente — mesmo
  princípio já aplicado a `postgres-test`. O limiar de *multipart upload* é
  propositadamente baixo em `.env.test` (5 MB), para exercitar esse caminho nos testes
  sem precisar de um ficheiro de 100 MB.
- **Homologação/produção**: o serviço compatível com S3 escolhido na Fase 5
  (Deployment) — o módulo funciona identicamente, sem alterações de código, apenas de
  configuração (`STORAGE_*`).

## Testes

- `apps/api/src/storage/*.spec.ts` — testes unitários com o SDK mockado
  (`aws-sdk-client-mock`): validação de extensão/MIME/tamanho, geração de chave não
  previsível, deteção de assinatura de ficheiro, decisão single/multipart, limpeza de
  objetos órfãos (nunca remove um objeto referenciado, mesmo arquivado).
- `apps/api/test/integration/storage.integration-spec.ts` — teste de integração real
  contra o MinIO de testes: upload por URL pré-assinado, download com `Range` real
  (`206 Partial Content`), remoção automática de um ficheiro com assinatura real
  diferente do tipo declarado, *multipart upload* completo com verificação de
  integridade byte a byte, abandono de um *multipart upload* incompleto (simula uma
  falha de rede a meio), e limpeza de objetos órfãos.
