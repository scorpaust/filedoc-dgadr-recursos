# Filedoc Recursos Formativos — Especificações do Projeto

🚀 **Portal interno de formação, documentação e suporte para utilizadores do Filedoc na DGADR**

---

## Problema — ideia central

Numa organização como a DGADR, os recursos de apoio à utilização do Filedoc tendem a estar dispersos por múltiplos locais e canais: pastas partilhadas, documentos PDF avulsos, vídeos gravados em diferentes momentos, mensagens de correio eletrónico, instruções informais transmitidas oralmente, respostas dadas individualmente a colegas, documentos guardados localmente em postos de trabalho, diferentes canais de suporte e, sobretudo, conhecimento que nunca chega a ser documentado.

Esta dispersão traz consequências concretas para os trabalhadores:

- dificuldade em encontrar o recurso certo no momento em que é necessário;
- perda de tempo na procura de informação já existente;
- repetição das mesmas dúvidas por diferentes pessoas;
- utilização de instruções desatualizadas ou já corrigidas;
- inconsistência na forma como os procedimentos são executados;
- dependência excessiva de apoio individual de colegas mais experientes;
- dificuldade em acompanhar o estado dos pedidos de suporte já colocados;
- ausência de um histórico centralizado de dúvidas e respostas;
- menor autonomia dos trabalhadores na resolução de situações comuns.

**Solução:**

> O Filedoc Recursos Formativos disponibiliza um único portal interno, pesquisável, organizado e acessível, onde os trabalhadores da DGADR podem aprender a utilizar o Filedoc, consultar documentação de apoio e obter suporte sempre que necessário.

---

## Utilizadores

### Trabalhador da DGADR

O trabalhador comum necessita de:

- encontrar rapidamente os recursos relevantes para a tarefa que está a executar;
- pesquisar por tarefa ou procedimento, e não apenas por título exato;
- consultar vídeos formativos;
- abrir guias passo a passo em PDF;
- consultar dicas rápidas;
- consultar perguntas frequentes;
- criar pedidos de suporte quando não encontra resposta;
- acompanhar o estado dos próprios pedidos;
- responder à equipa de suporte quando é pedida informação adicional.

### Novo utilizador do Filedoc

O trabalhador que está a iniciar a utilização do Filedoc necessita de:

- conteúdos de iniciação, pensados para quem nunca utilizou a plataforma;
- orientação passo a passo, sem assumir conhecimento prévio;
- explicações simples e diretas;
- identificação clara do fluxo documental em que se encontra;
- recursos recomendados como ponto de partida.

### Utilizador experiente

O trabalhador já familiarizado com o Filedoc necessita de:

- pesquisa rápida, sem percorrer conteúdos introdutórios;
- conteúdos de nível intermédio e avançado;
- procedimentos específicos para situações particulares;
- apoio na resolução de situações menos frequentes;
- consulta de atualizações a procedimentos já conhecidos.

### Editor de conteúdos

O editor de conteúdos necessita de:

- criar novos recursos formativos;
- editar recursos existentes;
- carregar vídeos e ficheiros PDF;
- criar e associar miniaturas;
- organizar os conteúdos por fluxo, tipo de documento, dificuldade e etiquetas;
- guardar recursos como rascunho antes da publicação;
- publicar recursos quando estiverem prontos;
- despublicar recursos que deixem de ser válidos sem os eliminar;
- arquivar recursos obsoletos;
- gerir dicas rápidas e perguntas frequentes.

### Agente de suporte

O agente de suporte necessita de:

- consultar os tickets que lhe estão atribuídos ou disponíveis;
- filtrar pedidos por estado, categoria, prioridade ou data;
- assumir pedidos de suporte;
- responder aos trabalhadores;
- solicitar informação adicional quando necessário;
- adicionar notas internas, não visíveis ao trabalhador;
- atualizar o estado dos pedidos;
- associar recursos formativos relevantes a um ticket;
- resolver e encerrar pedidos.

### Administrador

O administrador necessita de:

- gerir contas de utilizador;
- atribuir funções aos utilizadores;
- ativar e desativar contas;
- gerir taxonomias de organização de conteúdos (fluxos, tipos de documento, etiquetas);
- consultar registos de auditoria;
- configurar parâmetros operacionais da aplicação;
- supervisionar, de forma transversal, a atividade editorial e de suporte.

### Funções do sistema

A aplicação define as seguintes funções:

- `EMPLOYEE`;
- `CONTENT_EDITOR`;
- `SUPPORT_AGENT`;
- `ADMIN`.

Esclarecimentos importantes:

- cada utilizador pode ter uma ou mais funções atribuídas em simultâneo (por exemplo, um utilizador pode ser `CONTENT_EDITOR` e `ADMIN` ao mesmo tempo);
- a autorização de uma ação ou de um ecrã depende de o utilizador possuir, entre as suas funções, pelo menos uma das funções exigidas para essa ação ou ecrã;
- toda a autorização deve ser validada no backend, independentemente do que é apresentado no frontend;
- a ocultação de elementos de interface no frontend não constitui, por si só, um mecanismo de controlo de segurança;
- cada utilizador deve aceder apenas aos dados que as suas funções permitem consultar ou alterar.

---

## Funcionalidades

### A. Recursos e tipos de recurso

Os recursos formativos pertencem a um dos seguintes tipos de sistema, que não podem ser eliminados ou alterados por utilizadores comuns:

- vídeo;
- guia passo a passo em PDF.

Cada recurso deve conter:

- identificador;
- título;
- slug;
- resumo;
- descrição;
- tipo de recurso;
- fluxo;
- tipo de documento;
- dificuldade;
- etiquetas;
- estado editorial;
- miniatura;
- ficheiro principal;
- duração, no caso de vídeo;
- número de páginas, no caso de PDF;
- número de passos, quando aplicável;
- data de publicação;
- data da última atualização;
- autor da criação;
- autor da última alteração.

**Estados editoriais:**

- rascunho;
- publicado;
- arquivado.

**Regras:**

- apenas recursos publicados são visíveis aos trabalhadores;
- recursos arquivados deixam de aparecer no catálogo público;
- recursos em rascunho apenas são visíveis a editores e administradores;
- os ficheiros não devem ser guardados diretamente na base de dados;
- a base de dados deve guardar apenas os respetivos metadados e referências de armazenamento.

**Rotas conceptuais esperadas:**

```text
/recursos
/recursos/videos
/recursos/guias
/recursos/:slug
```

---

### B. Organização dos recursos

Os recursos são organizados por:

- tipo de recurso;
- fluxo;
- tipo de documento;
- dificuldade;
- etiquetas;
- data de publicação;
- data de atualização.

**Fluxos iniciais:**

- Criação e registo;
- Correspondência;
- Tramitação;
- Assinatura;
- Pesquisa;
- Gestão documental;
- Arquivo;
- Correções.

**Tipos de documento iniciais:**

- Informação;
- Ofício;
- Despacho;
- Processo;
- Correspondência;
- Anexo;
- Diversos.

**Níveis de dificuldade:**

- Iniciação;
- Intermédia;
- Avançada.

Cada recurso pode ter um fluxo principal, um tipo de documento principal e várias etiquetas.

Os administradores e os editores autorizados podem gerir fluxos, tipos de documento, etiquetas, a respetiva ordem de apresentação e o estado ativo ou inativo de cada taxonomia.

Não é permitida a eliminação direta de uma taxonomia associada a recursos existentes. A operação deve ser bloqueada ou exigir uma migração explícita dos conteúdos associados para outra taxonomia antes de prosseguir.

---

### C. Catálogo, pesquisa e filtros

A página do catálogo permite:

- pesquisar por título;
- pesquisar por resumo;
- pesquisar por descrição;
- pesquisar por etiquetas;
- filtrar por tipo de recurso;
- filtrar por fluxo;
- filtrar por tipo de documento;
- filtrar por dificuldade;
- ordenar por relevância;
- ordenar por data de publicação;
- ordenar por última atualização;
- ordenar alfabeticamente;
- limpar todos os filtros;
- consultar o número total de resultados;
- navegar entre páginas de resultados.

**A pesquisa deve:**

- ser executada no backend;
- aceitar apenas parâmetros validados;
- utilizar paginação;
- limitar o número máximo de resultados por página;
- preservar os filtros relevantes no URL, permitindo partilhar e retomar uma pesquisa;
- apresentar um estado vazio claro quando não existirem resultados;
- permitir remover filtros individualmente;
- funcionar corretamente em dispositivos móveis.

**Cada cartão de recurso apresenta:**

- miniatura;
- tipo;
- título;
- resumo;
- fluxo;
- tipo de documento;
- dificuldade;
- duração (vídeo) ou número de páginas (PDF);
- data da última atualização;
- ação principal.

**Ações principais:**

- "Ver vídeo";
- "Abrir guia".

---

### D. Vídeos

A página de um vídeo apresenta:

- título;
- descrição;
- leitor de vídeo;
- duração;
- dificuldade;
- fluxo;
- tipo de documento;
- etiquetas;
- tópicos abordados;
- data de atualização;
- recursos relacionados;
- ação para pedir suporte sobre o tema.

**O leitor de vídeo deve:**

- utilizar controlos acessíveis;
- não iniciar reprodução automaticamente;
- permitir reprodução em ecrã completo;
- adaptar-se a dispositivos móveis;
- suportar legendas quando disponíveis;
- apresentar uma alternativa textual ao conteúdo;
- carregar o ficheiro através de um acesso autorizado;
- não expor permanentemente o endereço interno do ficheiro.

Os vídeos são guardados num armazenamento de objetos e servidos através de URL temporário, acesso validado pela API, ou mecanismo equivalente seguro.

---

### E. Guias em PDF

A página de um guia apresenta:

- título;
- descrição;
- visualizador de PDF;
- número de páginas;
- dificuldade;
- fluxo;
- tipo de documento;
- etiquetas;
- data da última atualização;
- ação para descarregar;
- recursos relacionados;
- ação para pedir suporte sobre o tema.

**O sistema deve:**

- permitir abrir o PDF diretamente no browser;
- permitir descarregar o ficheiro;
- apresentar uma alternativa quando o browser não suportar a visualização;
- validar a autorização do utilizador antes de fornecer o ficheiro;
- não reescrever o conteúdo do PDF;
- não expor diretamente ficheiros privados sem controlo de acesso.

---

### F. Dicas rápidas

A aplicação disponibiliza uma área de dicas rápidas. Cada dica tem:

- identificador;
- título;
- conteúdo;
- ordem;
- estado editorial;
- data de publicação;
- data de atualização;
- autor.

**Conteúdos iniciais de exemplo:**

- Confirme os metadados antes de submeter um documento;
- Pesquise antes de criar um novo registo;
- Utilize títulos claros e descritivos;
- Acompanhe as tarefas pendentes com regularidade.

Os editores podem criar, editar, ordenar, publicar, despublicar e arquivar dicas.

---

### G. Perguntas frequentes

A aplicação disponibiliza uma área de perguntas frequentes. Cada pergunta frequente tem:

- pergunta;
- resposta;
- categoria opcional;
- ordem;
- estado editorial;
- data de publicação;
- data de atualização;
- autor.

**Perguntas iniciais de exemplo:**

- Não consigo aceder ao Filedoc. O que devo verificar?
- Um documento foi devolvido. Como devo proceder?
- Como posso localizar um processo antigo?
- Quando devo abrir um pedido de suporte?

A interface utiliza acordeões acessíveis para apresentar as perguntas e respostas.

As respostas devem ser prudentes, claras, genéricas quando não existir um procedimento institucional confirmado, e sempre escritas em português de Portugal.

---

### H. Pedidos de suporte

Os trabalhadores autenticados podem criar pedidos de suporte. Cada pedido contém:

- identificador;
- referência;
- assunto;
- descrição;
- categoria;
- prioridade;
- estado;
- solicitante;
- responsável;
- recurso relacionado (opcional);
- data de criação;
- data de atualização;
- data de resolução;
- data de encerramento.

**Categorias iniciais:**

- Acesso ou permissões;
- Criação e registo;
- Tramitação;
- Assinatura;
- Pesquisa ou arquivo;
- Erro técnico;
- Outra questão.

**Prioridades:**

- Baixa;
- Normal;
- Alta;
- Bloqueante.

**Estados (apresentação em português):**

- Aberto;
- Em tratamento;
- A aguardar resposta do utilizador;
- Resolvido;
- Encerrado.

**Estados internos correspondentes:**

- `OPEN`;
- `IN_PROGRESS`;
- `WAITING_FOR_USER`;
- `RESOLVED`;
- `CLOSED`.

A prioridade bloqueante deve apresentar a explicação:

> Utilize apenas quando o problema impedir totalmente a execução de uma tarefa urgente.

---

### I. Mensagens e histórico de suporte

Cada ticket tem um histórico cronológico, que pode incluir:

- criação do pedido;
- mensagens do trabalhador;
- respostas do suporte;
- alterações de estado;
- alterações de prioridade;
- atribuições;
- anexos;
- resolução;
- encerramento.

Existem dois tipos de comunicação:

**Mensagem pública** — visível para o trabalhador que criou o pedido, para os agentes de suporte e para os administradores.

**Nota interna** — visível apenas para os agentes de suporte e para os administradores.

A API deve impedir que trabalhadores obtenham notas internas através da manipulação de pedidos HTTP.

**O trabalhador pode:**

- consultar apenas os próprios pedidos;
- responder a pedidos que permitam novas respostas;
- anexar informação adicional;
- confirmar a resolução do pedido;
- consultar o histórico público do ticket.

**O agente de suporte pode:**

- consultar os tickets a que está autorizado a aceder;
- assumir um ticket;
- reatribuir um ticket a outro agente;
- responder;
- adicionar notas internas;
- alterar categoria;
- alterar prioridade;
- alterar estado;
- associar recursos formativos;
- marcar como resolvido;
- encerrar.

---

### J. Referências dos tickets

Cada ticket recebe uma referência única e legível.

**Formato visual sugerido:**

```text
SUP-AAAA-XXXXXX
```

**Regras:**

- a referência não deve ser utilizada como único mecanismo de autorização de acesso ao ticket;
- deve existir uma restrição de unicidade sobre a referência;
- a parte aleatória da referência não deve ser facilmente previsível;
- a referência deve permitir pesquisa no painel de suporte;
- a referência deve ser apresentada em todas as páginas relevantes do ticket.

---

### K. Anexos de suporte

Os tickets podem aceitar anexos quando esta funcionalidade estiver ativa, respeitando os seguintes requisitos:

- formatos permitidos configuráveis;
- tamanho máximo configurável;
- número máximo de anexos por ticket configurável;
- validação da extensão do ficheiro;
- validação do tipo MIME real do ficheiro;
- nomes de armazenamento aleatórios;
- preservação do nome original apenas como metadado;
- bloqueio de ficheiros executáveis;
- autorização obrigatória antes do acesso ao ficheiro;
- utilização de URLs temporários;
- associação do anexo ao ticket e à mensagem correspondente;
- eliminação em conformidade com a política de retenção definida.

O sistema não deve confiar apenas na extensão do ficheiro, no nome fornecido pelo utilizador ou no tipo MIME enviado pelo cliente para validar um anexo.

---

### L. Autenticação

O MVP suporta:

- autenticação por e-mail e palavra-passe;
- encerramento de sessão;
- consulta do utilizador atual;
- alteração de palavra-passe;
- sessões seguras;
- contas ativadas administrativamente.

**Não existe no MVP:**

- registo público;
- autenticação anónima;
- criação livre de contas;
- acesso a páginas internas sem sessão iniciada.

As palavras-passe são armazenadas com Argon2id, ou um algoritmo moderno equivalente.

**As sessões utilizam:**

- cookies `HttpOnly`;
- atributo `Secure` em produção;
- política `SameSite` adequada;
- expiração definida;
- possibilidade de revogação;
- proteção contra tentativas repetidas de autenticação.

As mensagens de erro de autenticação não devem revelar se um determinado e-mail está ou não registado no sistema.

---

### M. Preparação para autenticação institucional (evolução futura)

A arquitetura deve estar preparada para uma futura integração com:

- OIDC;
- SSO institucional;
- um fornecedor de identidade da organização.

Esta especificação não define nem inventa fornecedor, tenant, client ID, client secret, grupos, endpoints ou domínio institucional, por não existir, nesta fase, confirmação destes elementos.

A autenticação local deve continuar disponível em ambientes de desenvolvimento e de teste, independentemente da futura integração institucional.

---

### N. Gestão editorial

Os editores e administradores podem:

- listar recursos;
- pesquisar;
- filtrar;
- criar;
- editar;
- duplicar;
- pré-visualizar;
- guardar como rascunho;
- publicar;
- despublicar;
- arquivar;
- carregar vídeos;
- carregar PDFs;
- carregar miniaturas;
- substituir ficheiros;
- consultar metadados;
- consultar autores e datas de criação e atualização.

**Validações obrigatórias na edição de um recurso:**

- título;
- slug único;
- resumo;
- descrição;
- tipo;
- fluxo;
- tipo de documento;
- dificuldade;
- ficheiro principal;
- texto alternativo da miniatura;
- duração, para vídeos;
- páginas ou passos, quando aplicável.

---

### O. Gestão de utilizadores

Os administradores podem:

- listar utilizadores;
- pesquisar por nome;
- pesquisar por e-mail;
- filtrar por função (um utilizador pode corresponder a mais do que um filtro, caso tenha mais do que uma função);
- filtrar por estado;
- criar conta;
- alterar nome;
- atribuir uma ou mais funções a um utilizador;
- remover funções previamente atribuídas, desde que o utilizador fique sempre com pelo menos uma função;
- ativar conta;
- desativar conta;
- invalidar sessões ativas;
- consultar o último acesso.

**Regras:**

- não é permitido remover a função `ADMIN` do último utilizador que a possui, nem desativar esse utilizador, enquanto for o único com essa função;
- os hashes de palavras-passe nunca são apresentados;
- as palavras-passe nunca são guardadas em logs;
- ações sensíveis exigem confirmação explícita;
- as ações administrativas ficam registadas na auditoria;
- utilizadores desativados não podem iniciar sessão;
- as sessões existentes de utilizadores desativados são invalidadas de imediato.

---

### P. Auditoria

São registadas as ações relevantes, incluindo:

- criação de utilizadores;
- alteração de funções;
- ativação e desativação de contas;
- publicação de recursos;
- arquivo de recursos;
- substituição de ficheiros;
- alterações críticas em tickets;
- alterações de configuração.

**Cada registo de auditoria pode incluir:**

- ator;
- ação;
- tipo de entidade;
- identificador da entidade;
- data e hora;
- metadados estritamente necessários;
- identificador de correlação.

**Não são guardados em auditoria:**

- palavras-passe;
- tokens;
- cookies;
- segredos;
- conteúdo integral de ficheiros;
- dados pessoais desnecessários.

---

## Dados

O modelo de dados apresentado de seguida é uma proposta inicial e poderá evoluir ao longo do desenvolvimento através de migrações Prisma versionadas.

### `USER`

- `id`
- `name`
- `email`
- `passwordHash`
- `status`
- `lastLoginAt`
- `createdAt`
- `updatedAt`

Relações: funções atribuídas (`USERROLE`); sessões; recursos criados; recursos atualizados; tickets solicitados; tickets atribuídos; mensagens; anexos; registos de auditoria.

### `USERROLE`

Tabela de associação entre utilizadores e funções, permitindo que um utilizador acumule mais do que uma função (por exemplo, `CONTENT_EDITOR` e `ADMIN` em simultâneo):

- `userId`
- `role` (`EMPLOYEE` | `CONTENT_EDITOR` | `SUPPORT_AGENT` | `ADMIN`)

A chave primária é composta pelos dois valores, impedindo a mesma função de ser atribuída duas vezes ao mesmo utilizador.

### `SESSION`

- `id`
- `userId`
- `tokenHash`
- `expiresAt`
- `revokedAt`
- `createdAt`
- `updatedAt`

### `RESOURCE`

- `id`
- `title`
- `slug`
- `summary`
- `description`
- `resourceType`
- `difficulty`
- `workflowId`
- `documentTypeId`
- `status`
- `durationMinutes`
- `stepCount`
- `pageCount`
- `fileObjectKey`
- `thumbnailObjectKey`
- `captionObjectKey`
- `publishedAt`
- `createdById`
- `updatedById`
- `createdAt`
- `updatedAt`

### `WORKFLOW`

- `id`
- `name`
- `slug`
- `description`
- `isActive`
- `sortOrder`
- `createdAt`
- `updatedAt`

### `DOCUMENTTYPE`

- `id`
- `name`
- `slug`
- `description`
- `isActive`
- `sortOrder`
- `createdAt`
- `updatedAt`

### `TAG`

- `id`
- `name`
- `slug`
- `createdAt`
- `updatedAt`

### `RESOURCETAG`

Tabela de associação entre recursos e etiquetas:

- `resourceId`
- `tagId`

A chave primária é composta pelos dois identificadores.

### `TIP`

- `id`
- `title`
- `content`
- `status`
- `sortOrder`
- `publishedAt`
- `createdById`
- `updatedById`
- `createdAt`
- `updatedAt`

### `FAQ`

- `id`
- `question`
- `answer`
- `category`
- `status`
- `sortOrder`
- `publishedAt`
- `createdById`
- `updatedById`
- `createdAt`
- `updatedAt`

### `SUPPORTTICKET`

- `id`
- `reference`
- `subject`
- `description`
- `category`
- `priority`
- `status`
- `requesterId`
- `assigneeId`
- `relatedResourceId`
- `resolvedAt`
- `closedAt`
- `createdAt`
- `updatedAt`

### `TICKETMESSAGE`

- `id`
- `ticketId`
- `authorId`
- `content`
- `visibility`
- `createdAt`
- `updatedAt`

Valores de visibilidade: `PUBLIC`; `INTERNAL`.

### `TICKETATTACHMENT`

- `id`
- `ticketId`
- `messageId`
- `uploadedById`
- `objectKey`
- `originalName`
- `mimeType`
- `size`
- `createdAt`

### `AUDITLOG`

- `id`
- `actorId`
- `action`
- `entityType`
- `entityId`
- `metadata`
- `correlationId`
- `createdAt`

---

## Regras do modelo de dados

- e-mail único;
- slug de recurso único;
- referência de ticket única;
- integridade referencial entre entidades relacionadas;
- eliminação restrita quando existirem relações relevantes associadas;
- índices nos campos utilizados em pesquisa e filtros;
- datas armazenadas de forma consistente;
- transações em operações com várias alterações relacionadas;
- ficheiros armazenados fora da base de dados;
- migrações Prisma obrigatórias para qualquer alteração estrutural;
- seeds apenas para dados de desenvolvimento ou configuração inicial.

> Nunca utilizar `prisma db push` para alterar diretamente a estrutura da base de dados em ambientes partilhados ou de produção. Todas as alterações estruturais devem ser realizadas através de migrações Prisma versionadas, testadas em desenvolvimento e aplicadas de forma controlada nos restantes ambientes.

---

## Stack tecnológica

### Frontend

- Angular;
- TypeScript em modo estrito;
- Angular Router;
- componentes standalone;
- Angular Signals;
- Angular Reactive Forms;
- Angular HttpClient;
- SCSS;
- Angular Material e Angular CDK quando acrescentarem acessibilidade e consistência;
- lazy loading de rotas;
- aplicação cliente sem SSR ou SSG no MVP.

### Backend

- NestJS;
- Node.js;
- TypeScript;
- API REST;
- OpenAPI/Swagger;
- DTOs;
- validação no servidor;
- guards de autenticação;
- guards de autorização;
- tratamento centralizado de erros;
- logs estruturados.

### Base de dados e ORM

- PostgreSQL;
- Prisma ORM;
- migrações Prisma versionadas;
- seeds idempotentes;
- transações;
- índices;
- integridade referencial.

### Armazenamento de ficheiros

- MinIO em desenvolvimento;
- serviço compatível com S3 em produção;
- separação entre metadados e conteúdo;
- URLs temporários;
- acesso autorizado;
- buckets não públicos por defeito.

### Autenticação

- e-mail e palavra-passe no MVP;
- sessões seguras;
- cookies `HttpOnly`;
- preparação para OIDC;
- sem registo público.

### Infraestrutura

- Docker;
- Docker Compose;
- PostgreSQL;
- MinIO;
- API;
- frontend;
- health checks;
- volumes persistentes.

### Testes

- testes unitários Angular;
- testes unitários NestJS;
- testes de integração;
- PostgreSQL de teste;
- Playwright para E2E;
- axe-core ou equivalente para acessibilidade.

### CI/CD

- lint;
- verificação TypeScript;
- testes;
- build;
- validação de migrações;
- análise de dependências;
- testes E2E;
- criação de imagens Docker.

---

## Arquitetura da API

A API é versionada:

```text
/api/v1
```

### Autenticação

```text
POST /auth/login
POST /auth/logout
GET  /auth/me
POST /auth/change-password
```

### Recursos

```text
GET /resources
GET /resources/:slug
GET /resources/:id/file
GET /resources/:id/thumbnail
```

### Dicas e perguntas frequentes

```text
GET /tips
GET /faqs
```

### Tickets do trabalhador

```text
POST /tickets
GET  /tickets/mine
GET  /tickets/mine/:id
POST /tickets/mine/:id/messages
POST /tickets/mine/:id/attachments
POST /tickets/mine/:id/confirm-resolution
```

### Gestão de suporte

```text
GET   /support/tickets
GET   /support/tickets/:id
PATCH /support/tickets/:id
POST  /support/tickets/:id/messages
POST  /support/tickets/:id/internal-notes
POST  /support/tickets/:id/assign
POST  /support/tickets/:id/resolve
POST  /support/tickets/:id/close
```

### Gestão editorial

Endpoints protegidos para: recursos; upload de ficheiros; publicação; arquivo; dicas; perguntas frequentes; fluxos; tipos de documento; etiquetas.

### Administração

Endpoints protegidos para: utilizadores; funções; ativação; desativação; sessões; auditoria; configurações permitidas.

### Operação

```text
GET /health
GET /ready
```

---

## Respostas e erros da API

Formato consistente de erro:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Não foi possível concluir o pedido.",
  "fieldErrors": {},
  "correlationId": "identificador",
  "timestamp": "data e hora"
}
```

As respostas de erro não devem expor: stack traces em produção; queries; dados internos; caminhos de ficheiros; segredos; tokens; existência de contas; ou quaisquer outros detalhes desnecessários da infraestrutura.

---

## Monetização

> O Filedoc Recursos Formativos é um serviço interno da DGADR. Todos os trabalhadores autorizados devem ter acesso sem pagamentos, subscrições ou planos comerciais.

### Acesso interno

- sem pagamento;
- sem subscrição;
- sem plano gratuito ou profissional;
- sem limites comerciais;
- sem faturação;
- sem período experimental;
- sem checkout;
- sem fornecedores de pagamento.

### Funcionalidades proibidas

Não é implementado: Stripe; pagamentos; webhooks de faturação; planos; tabelas de subscrição; preços; upgrades; downgrades; quotas comerciais; paywalls.

As permissões dependem apenas da autenticação, da função atribuída, do estado da conta e das regras de autorização — nunca de qualquer critério comercial.

---

## UI/UX

### Geral

A interface deve ser moderna, institucional, minimalista, clara, orientada para documentação, adequada a diferentes níveis de literacia digital e utilizável em modo claro e escuro. Como referência de estilo, podem considerar-se portais técnicos e ferramentas de documentação.

Utilizar: tipografia limpa; espaçamento consistente; hierarquia visual forte; cartões; etiquetas; contornos discretos; sombras suaves; estados de interação claros; componentes reutilizáveis.

### Estrutura

A aplicação autenticada utiliza: cabeçalho; navegação principal; pesquisa global; área de conteúdo; menu de utilizador; rodapé; navegação administrativa quando autorizada.

**Rotas ou áreas principais:**

- Início;
- Recursos;
- Vídeos;
- Guias;
- Dicas;
- Perguntas frequentes;
- Meus pedidos;
- Novo pedido;
- Gestão de suporte;
- Gestão de conteúdos;
- Administração.

### Página inicial

A página inicial inclui: hero; headline; subheading; botão para recursos; botão para suporte; três cartões de funcionalidades; pesquisa rápida; recursos em destaque; recursos recentes; acesso aos pedidos abertos do utilizador.

**Headline:**

> Domine o Filedoc, passo a passo.

**Subheading:**

> Consulte vídeos, guias práticos e dicas para executar os principais fluxos documentais. Quando precisar, coloque uma questão ou registe um pedido de suporte.

### Identidade visual

Utilizar os logótipos fornecidos da DGADR e do Filedoc, respeitando as seguintes regras: preservar proporções; não distorcer; não recolorir; não cortar indevidamente; utilizar texto alternativo; garantir espaço de proteção; garantir legibilidade em fundos claros e escuros.

**Paleta de referência** (a confirmar a partir dos recursos visuais fornecidos, sem constituir cores institucionais oficiais): azul-petróleo; verde; azul-claro; amarelo; laranja; coral; ameixa; cinzentos escuros.

### Tema

Implementar: modo claro; modo escuro; deteção da preferência do sistema; alternância manual; persistência da escolha; contraste WCAG AA; ausência de flash de tema durante o carregamento.

### Componentes

Criar componentes consistentes para: botões; campos; seletores; pesquisa; filtros; cartões de recurso; etiquetas; estados; tabelas; paginação; diálogos; menus; drawer móvel; toasts; alertas; skeletons; estados vazios; mensagens de erro; upload de ficheiros; histórico de tickets; editor de conteúdos.

### Estados da interface

Todos os componentes relevantes suportam: normal; hover; foco; ativo; selecionado; carregamento; sucesso; erro; vazio; desativado.

Nenhum botão deve existir apenas para decoração.

### Responsividade

A aplicação é desenvolvida com prioridade para desktop, mas deve permanecer plenamente utilizável em dispositivos móveis.

**Larguras a testar:** 320 px; 375 px; 768 px; 1024 px; 1440 px.

**Comportamentos esperados:** navegação transformada em menu ou drawer; filtros adaptados a ecrãs pequenos; grelhas convertidas em uma coluna; tabelas convertidas em cartões ou áreas com deslocamento acessível; formulários empilhados; diálogos adaptados; vídeos e PDFs responsivos; ausência de deslocamento horizontal involuntário.

### Microinterações

Implementar: transições suaves; estados hover; foco visível; toasts de sucesso e erro; skeletons; indicadores de processamento; confirmação de ações destrutivas; animações discretas; suporte para `prefers-reduced-motion`.

---

## Acessibilidade

Cumprir WCAG 2.2 nível AA sempre que aplicável, incluindo:

- `lang="pt-PT"`;
- HTML semântico;
- navegação por teclado;
- link para saltar para o conteúdo;
- foco visível;
- ordem de foco lógica;
- labels associados aos respetivos campos;
- mensagens de erro associadas aos campos correspondentes;
- `aria-live` para atualizações dinâmicas relevantes;
- textos alternativos em imagens e miniaturas;
- contraste suficiente;
- estados não dependentes apenas da cor;
- diálogos acessíveis;
- acordeões acessíveis;
- menus acessíveis;
- suporte a leitores de ecrã;
- redução de movimento;
- zoom até 200%;
- controlos com dimensão tátil adequada.

---

## Segurança

- validação no backend;
- autorização por função;
- autorização por recurso;
- proteção contra XSS;
- proteção contra CSRF;
- proteção contra injeção;
- CORS restritivo;
- rate limiting;
- headers de segurança;
- política de segurança de conteúdo;
- cookies seguros;
- sessões expiradas e revogáveis;
- proteção contra tentativas repetidas;
- validação de uploads;
- armazenamento privado;
- URLs temporários;
- segredos em variáveis de ambiente;
- logs sem informação sensível;
- auditoria;
- análise de dependências.

> Um trabalhador apenas pode consultar tickets, mensagens e anexos associados aos próprios pedidos.

---

## Privacidade e RGPD

- minimização dos dados recolhidos;
- limitação da finalidade;
- controlo de acesso;
- retenção configurável;
- eliminação controlada;
- proteção de anexos;
- transparência sobre o tratamento de dados;
- auditoria;
- ausência de rastreamento externo por defeito.

Não é definido, nesta especificação, um prazo institucional de retenção definitivo sem validação prévia pela DGADR.

**A documentar durante o desenvolvimento:**

- dados guardados;
- finalidade do tratamento;
- utilizadores com acesso;
- política de retenção;
- tratamento de ficheiros;
- tratamento de logs;
- processo de eliminação;
- processo de exportação, quando legalmente aplicável.

---

## Desempenho

- lazy loading;
- paginação no servidor;
- índices na base de dados;
- consultas Prisma otimizadas;
- prevenção de N+1;
- carregamento diferido de imagens;
- miniaturas otimizadas;
- carregamento progressivo de vídeo;
- compressão de resposta;
- cache controlada;
- limitação de resultados por pedido;
- cancelamento de pesquisas anteriores;
- skeletons durante o carregamento;
- tratamento adequado de redes lentas.

---

## Organização do repositório

Estrutura indicativa, que pode ser adaptada mantendo a separação entre frontend, backend, base de dados, tipos partilhados, infraestrutura e documentação:

```text
filedoc-dgadr-recursos/
├── apps/
│   ├── web/
│   │   ├── src/
│   │   └── angular.json
│   └── api/
│       ├── src/
│       └── prisma/
├── packages/
│   └── shared-types/
├── infrastructure/
│   ├── docker/
│   └── scripts/
├── docs/
├── .env.example
├── docker-compose.yml
├── package.json
├── project-overview.md
├── project-spec.md
└── README.md
```

---

## Variáveis de ambiente

A documentar, no mínimo:

```text
NODE_ENV
APP_URL
API_URL
DATABASE_URL
SESSION_SECRET
SESSION_TTL
ALLOWED_EMAIL_DOMAINS
STORAGE_ENDPOINT
STORAGE_REGION
STORAGE_BUCKET
STORAGE_ACCESS_KEY
STORAGE_SECRET_KEY
STORAGE_FORCE_PATH_STYLE
MAX_UPLOAD_SIZE
MAX_ATTACHMENTS_PER_TICKET
LOG_LEVEL
CORS_ALLOWED_ORIGINS
RETENTION_POLICY_DAYS
```

Devem existir variáveis opcionais para OIDC, desativadas por defeito, sem valores reais preenchidos.

Não incluir segredos reais no repositório. A aplicação deve validar as variáveis de ambiente no arranque.

---

## Workflow de desenvolvimento

- uma branch por funcionalidade;
- pull requests pequenas;
- revisão de código;
- migrações Prisma versionadas;
- seeds idempotentes;
- lint;
- formatação;
- TypeScript estrito;
- testes unitários;
- testes de integração;
- testes E2E;
- testes de acessibilidade;
- build antes do merge.

**Exemplos de nomes de branch:**

```text
feature/authentication
feature/resource-catalog
feature/resource-detail
feature/support-tickets
feature/content-management
feature/admin-users
feature/accessibility
```

---

## Testes

### Frontend

Testar: componentes; filtros; formulários; guards; serviços; permissões; navegação; tema; estados de erro; estados vazios; acessibilidade.

### Backend

Testar: autenticação; autorização; recursos; publicação; tickets; mensagens; notas internas; anexos; validações; paginação; filtros; auditoria; utilizadores desativados.

### E2E

Testar, no mínimo:

1. início de sessão;
2. pesquisa de recurso;
3. aplicação de filtros;
4. abertura de vídeo;
5. abertura de PDF;
6. criação de ticket;
7. consulta do ticket;
8. resposta do trabalhador;
9. resposta do agente;
10. nota interna;
11. resolução;
12. publicação de recurso;
13. gestão de utilizador;
14. bloqueio de acesso indevido.

---

## Roadmap

### MVP

- autenticação local;
- sessões seguras;
- funções e permissões;
- página inicial;
- catálogo;
- pesquisa;
- filtros;
- vídeos;
- PDFs;
- dicas;
- perguntas frequentes;
- criação de tickets;
- acompanhamento de tickets;
- mensagens;
- notas internas;
- gestão de suporte;
- gestão editorial;
- gestão de utilizadores;
- auditoria;
- PostgreSQL;
- Prisma;
- MinIO;
- Docker;
- testes essenciais.

### Segunda fase

- integração OIDC/SSO;
- notificações por correio eletrónico;
- legendas;
- transcrições;
- favoritos;
- avaliação de utilidade dos recursos;
- sugestões de recursos;
- indicadores agregados;
- pesquisa melhorada.

### Evolução futura

- integração com sistemas internos;
- importação de utilizadores;
- PWA;
- observabilidade institucional;
- retenção avançada;
- arquivo de conteúdos;
- melhorias analíticas agregadas.

Não são incluídos pagamentos em nenhuma fase do roadmap.

---

## Regras obrigatórias do projeto

- não utilizar pagamentos;
- não criar registo público;
- não guardar ficheiros binários no PostgreSQL;
- não expor ficheiros privados;
- não confiar apenas no frontend para permissões;
- não inventar integrações institucionais;
- não utilizar `prisma db push` em ambientes partilhados ou de produção;
- não deixar botões sem ação;
- não apresentar dados demonstrativos como oficiais;
- não desativar o modo estrito do TypeScript;
- não utilizar `any` sem justificação;
- não guardar segredos no repositório;
- não concluir o projeto com fluxos críticos simulados.

---

## Estado atual

- planeamento funcional definido;
- `project-overview.md` previsto ou criado;
- aplicação Angular iniciada;
- SCSS selecionado;
- SSR e SSG desativados;
- NestJS selecionado para o backend;
- PostgreSQL selecionado;
- Prisma selecionado;
- MinIO previsto para desenvolvimento;
- autenticação local prevista para o MVP;
- pagamentos excluídos do projeto;
- projeto pronto para implementação da arquitetura e do modelo de dados.

---

🏗️ **Filedoc Recursos Formativos — Especificações funcionais e técnicas para um portal interno seguro, acessível e orientado à aprendizagem.**
