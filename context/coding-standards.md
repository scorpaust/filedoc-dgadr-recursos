# Normas de Desenvolvimento

Estas normas aplicam-se a todo o projeto **Filedoc Recursos Formativos**, incluindo:

- aplicação Angular;
- API NestJS;
- esquema Prisma;
- migrações;
- testes;
- scripts;
- infraestrutura;
- documentação técnica.

Todos os novos desenvolvimentos, correções e revisões devem respeitar estas regras.

---

## TypeScript

**Regras obrigatórias:**

- ativar `strict`;
- ativar `noImplicitAny`;
- ativar `strictNullChecks`;
- ativar `noUncheckedIndexedAccess` quando compatível com o projeto;
- não utilizar `any`;
- utilizar `unknown` quando o tipo ainda não for conhecido;
- validar e restringir o valor antes de converter a partir de `unknown`;
- evitar coerções forçadas com `as`;
- não utilizar `as any`;
- não utilizar `@ts-ignore`;
- permitir `@ts-expect-error` apenas quando existir uma justificação clara e temporária;
- eliminar diretivas de supressão assim que deixarem de ser necessárias;
- definir tipos para modelos, DTOs, respostas da API, propriedades de componentes e configurações;
- utilizar inferência quando o tipo for óbvio;
- utilizar tipos explícitos em APIs públicas, funções exportadas e fronteiras entre módulos;
- utilizar `readonly` quando um valor não deva ser alterado;
- preferir uniões discriminadas a combinações ambíguas de propriedades opcionais;
- evitar enums numéricos;
- utilizar enums de texto ou uniões literais quando melhorarem a interoperabilidade;
- evitar tipos duplicados entre frontend e backend;
- manter contratos partilhados numa área própria, quando isso não criar acoplamento indevido;
- não expor diretamente tipos internos do Prisma na interface do utilizador;
- criar contratos específicos para entrada e saída da API;
- utilizar tipos anuláveis apenas quando `null` tiver significado funcional;
- não utilizar propriedades opcionais para representar estados semanticamente diferentes sem necessidade.

> Todo o código TypeScript deve compilar sem erros e sem depender de supressões globais do compilador.

---

## Angular

### Componentes

- utilizar componentes standalone;
- não criar novos `NgModule` sem necessidade técnica justificada;
- manter cada componente focado numa única responsabilidade;
- extrair componentes reutilizáveis quando existir repetição real;
- não transformar cada fragmento de HTML num componente sem benefício;
- utilizar `ChangeDetectionStrategy.OnPush` quando aplicável;
- preferir propriedades e sinais derivados a cálculos repetidos no template;
- evitar lógica de negócio dentro de templates;
- evitar chamadas de funções pesadas no template;
- manter templates legíveis;
- dividir templates excessivamente extensos;
- utilizar `input()` e `output()` quando a versão Angular adotada os suportar e forem consistentes com o projeto;
- tipar todos os inputs e outputs;
- não modificar diretamente valores recebidos por input;
- utilizar conteúdo projetado apenas quando melhorar reutilização e composição.

### Signals e estado

- utilizar Angular Signals para estado local e valores derivados;
- utilizar `computed()` para estado derivado;
- utilizar `effect()` apenas para efeitos secundários reais;
- não utilizar `effect()` como substituto de cálculos derivados;
- evitar estados duplicados;
- manter uma única fonte de verdade;
- utilizar serviços para estado partilhado entre funcionalidades;
- não introduzir uma biblioteca global de estado sem necessidade comprovada;
- não guardar tokens ou dados sensíveis no estado do browser;
- não utilizar `localStorage` como base de dados ou mecanismo de sessão.

### RxJS

- utilizar Observables para operações assíncronas, eventos e `HttpClient`;
- evitar subscrições aninhadas;
- utilizar operadores como `switchMap`, `concatMap`, `mergeMap` ou `exhaustMap` de acordo com a intenção;
- utilizar `switchMap` em pesquisas que devam cancelar pedidos anteriores;
- não utilizar `subscribe()` dentro de serviços para ocultar efeitos;
- preferir o `async` pipe ou a interoperabilidade Signals/RxJS;
- utilizar `takeUntilDestroyed()` quando existir uma subscrição imperativa;
- prevenir fugas de memória;
- tratar estados de erro nos fluxos observáveis;
- não utilizar `Subject` quando um Signal ou Observable derivado for suficiente.

### Formulários

- utilizar Angular Reactive Forms;
- utilizar formulários estritamente tipados;
- centralizar validadores reutilizáveis;
- não confiar apenas na validação frontend;
- apresentar erros junto aos campos;
- associar erros aos controlos para acessibilidade;
- impedir submissões duplicadas;
- desativar temporariamente a ação durante o processamento;
- marcar campos como tocados quando uma submissão inválida for tentada;
- não remover labels visíveis em favor exclusivo de placeholders;
- normalizar os dados antes do envio;
- não enviar propriedades desnecessárias à API.

### Routing

- utilizar Angular Router;
- carregar áreas funcionais de forma diferida;
- utilizar guards para experiência de navegação;
- não considerar guards frontend como controlo de segurança;
- validar permissões novamente no backend;
- utilizar resolvers apenas quando forem realmente necessários;
- manter filtros e paginação relevantes nos query parameters;
- utilizar rotas legíveis e consistentes;
- evitar informação sensível no URL;
- configurar uma página de acesso negado;
- configurar uma página de recurso não encontrado.

### Serviços

- manter serviços pequenos e focados;
- separar acesso HTTP, estado e regras de apresentação quando necessário;
- não criar serviços genéricos sem domínio claro;
- utilizar `providedIn: 'root'` apenas para serviços verdadeiramente globais;
- tipar todas as respostas do `HttpClient`;
- não devolver `Observable<any>`;
- centralizar a configuração da URL da API;
- utilizar interceptors para preocupações transversais;
- não utilizar interceptors para ocultar regras de negócio.

---

## NestJS

### Organização

- organizar o backend por domínios funcionais;
- utilizar módulos NestJS por funcionalidade;
- manter controllers focados no protocolo HTTP;
- manter regras de negócio nos services;
- evitar regras de negócio em controllers;
- evitar acesso direto ao Prisma nos controllers;
- utilizar providers especializados quando uma funcionalidade justificar separação;
- evitar serviços excessivamente grandes;
- não criar abstrações genéricas prematuramente;
- impedir dependências circulares;
- utilizar `forwardRef()` apenas como último recurso e com justificação.

**Estrutura indicativa por domínio:**

```text
src/
├── auth/
├── users/
├── resources/
├── taxonomies/
├── tips/
├── faqs/
├── tickets/
├── storage/
├── audit/
├── common/
└── config/
```

### Controllers

- utilizar decorators HTTP apropriados;
- devolver códigos HTTP corretos;
- não expor entidades Prisma diretamente;
- utilizar DTOs de resposta quando necessário;
- validar parâmetros de rota;
- validar query parameters;
- aplicar guards de autenticação e autorização;
- não confiar em dados de utilizador enviados pelo cliente quando podem ser obtidos da sessão;
- obter o utilizador autenticado através de um decorator ou mecanismo centralizado;
- não capturar exceções apenas para as voltar a lançar sem acrescentar valor.

### Services

- implementar regras de negócio;
- validar a existência e o estado das entidades;
- validar autorização por recurso;
- utilizar transações em alterações relacionadas;
- evitar consultas repetidas;
- evitar efeitos secundários escondidos;
- devolver resultados previsíveis;
- manter funções pequenas e semanticamente claras;
- não depender de objetos HTTP;
- não construir mensagens de interface no domínio quando puderem ser traduzidas no frontend.

### DTOs e validação

- utilizar DTOs para todas as entradas externas;
- aplicar validação global;
- rejeitar propriedades não autorizadas;
- transformar tipos apenas de forma controlada;
- definir limites de comprimento;
- validar enums;
- validar identificadores;
- validar paginação;
- validar ordenação contra uma lista permitida;
- não aceitar diretamente objetos Prisma como corpo de pedidos;
- utilizar DTOs distintos para criação, atualização, filtros e respostas;
- evitar DTOs com um número excessivo de campos opcionais;
- utilizar `PartialType` apenas quando a semântica da atualização parcial for adequada.

### Guards e autorização

- aplicar autenticação de forma central;
- aplicar autorização por função;
- aplicar autorização por propriedade do recurso;
- não confiar apenas na função para operações que dependam do proprietário;
- garantir que um trabalhador apenas consulta os próprios tickets;
- impedir o acesso de trabalhadores a notas internas;
- impedir acesso direto a anexos sem autorização;
- impedir utilizadores desativados de utilizar sessões existentes;
- testar todos os caminhos de autorização negativa.

### Interceptors, pipes e filters

Utilizar mecanismos transversais para:

- identificadores de correlação;
- logs;
- serialização;
- medição de duração;
- tratamento consistente de exceções;
- validação;
- transformação segura.

Não utilizar mecanismos transversais para esconder regras funcionais específicas.

---

## Prisma e PostgreSQL

### Acesso a dados

- utilizar Prisma ORM para acesso normal à base de dados;
- não executar SQL manual quando o Prisma conseguir representar a operação de forma segura e clara;
- permitir SQL parametrizado apenas quando existir uma necessidade técnica documentada;
- nunca concatenar valores do utilizador em SQL;
- centralizar o ciclo de vida do Prisma Client;
- não criar uma nova instância do Prisma Client por pedido;
- utilizar `select` para obter apenas os campos necessários;
- utilizar `include` apenas quando a relação for realmente necessária;
- evitar carregar relações completas sem limites;
- prevenir consultas N+1;
- utilizar paginação em listagens;
- definir limites máximos de resultados;
- criar índices para pesquisas e filtros frequentes;
- garantir unicidade ao nível da base de dados;
- utilizar constraints e relações para assegurar integridade;
- não depender apenas de validações aplicacionais.

### Migrações

> Nunca utilizar `prisma db push` para alterar a estrutura de bases de dados partilhadas, de teste integrado, de homologação ou de produção.

**Regras obrigatórias:**

- utilizar `prisma migrate dev` durante o desenvolvimento;
- gerar uma migração para cada alteração estrutural;
- atribuir nomes descritivos às migrações;
- rever o SQL gerado;
- testar migrações numa base de dados limpa;
- testar migrações sobre dados semelhantes aos reais;
- executar `prisma migrate status` antes de criar um pull request;
- utilizar `prisma migrate deploy` em deployment;
- não editar uma migração já aplicada num ambiente partilhado;
- criar uma nova migração para corrigir alterações anteriores;
- não apagar migrações versionadas;
- incluir migrações no controlo de versões;
- documentar migrações destrutivas;
- criar estratégia de migração de dados antes de tornar colunas obrigatórias;
- não utilizar automaticamente `prisma migrate reset` fora de ambientes locais descartáveis.

### Transações

Utilizar transações quando uma operação:

- cria ou altera várias entidades relacionadas;
- atualiza o estado de um ticket e regista o histórico;
- publica um recurso e atualiza metadados associados;
- altera funções e invalida sessões;
- remove referências e ficheiros associados;
- pode deixar dados inconsistentes se for parcialmente concluída.

Manter transações curtas e evitar operações externas demoradas dentro da transação.

### Seeds

- criar seeds idempotentes;
- separar dados estruturais de dados demonstrativos;
- não criar contas demonstrativas em produção;
- não incluir palavras-passe reais;
- não apagar dados existentes de forma implícita;
- permitir executar os seeds várias vezes sem duplicação.

### Nomenclatura da base de dados

- utilizar nomes consistentes;
- preferir nomes de modelos Prisma em PascalCase;
- utilizar campos em camelCase no Prisma;
- mapear nomes SQL apenas quando necessário;
- utilizar timestamps consistentes;
- utilizar UTC na persistência;
- definir comportamentos de eliminação conscientemente;
- não utilizar `Cascade` sem avaliar o impacto.

---

## Armazenamento de ficheiros

- não guardar vídeos, PDFs, imagens ou anexos como binários no PostgreSQL;
- guardar os conteúdos em MinIO ou armazenamento compatível com S3;
- guardar apenas metadados e chaves dos objetos na base de dados;
- utilizar buckets privados por defeito;
- validar autorização antes de emitir acesso;
- utilizar URLs temporários;
- não expor chaves internas de objetos na interface quando evitável;
- gerar nomes de armazenamento não previsíveis;
- preservar o nome original apenas como metadado;
- validar extensão;
- validar MIME type;
- validar assinatura ou conteúdo do ficheiro quando tecnicamente possível;
- impor tamanho máximo;
- impor número máximo de anexos;
- rejeitar executáveis;
- não confiar no nome fornecido pelo utilizador;
- eliminar objetos órfãos;
- tratar falhas parciais entre base de dados e armazenamento;
- registar operações críticas;
- não colocar credenciais de armazenamento no frontend.

---

## Organização de ficheiros

**Estrutura coerente para o frontend:**

```text
apps/web/src/app/
├── core/
│   ├── auth/
│   ├── guards/
│   ├── interceptors/
│   ├── layout/
│   └── services/
├── shared/
│   ├── components/
│   ├── directives/
│   ├── pipes/
│   ├── models/
│   └── utils/
├── features/
│   ├── home/
│   ├── resources/
│   ├── tips/
│   ├── faqs/
│   ├── tickets/
│   ├── content-management/
│   └── administration/
└── app.routes.ts
```

**Regras:**

- colocar funcionalidades dentro de `features`;
- manter serviços globais em `core`;
- colocar elementos reutilizáveis e sem regras de domínio em `shared`;
- não importar uma funcionalidade diretamente de outra;
- mover contratos partilhados para uma área comum apenas quando forem realmente partilhados;
- evitar ficheiros `utils.ts` genéricos e excessivos;
- preferir nomes que indiquem claramente a responsabilidade.

**Estrutura coerente para o backend:**

```text
apps/api/src/
├── auth/
├── users/
├── resources/
├── taxonomies/
├── tips/
├── faqs/
├── tickets/
├── storage/
├── audit/
├── common/
├── config/
└── main.ts
```

Cada domínio pode incluir:

```text
feature/
├── dto/
├── entities/
├── guards/
├── feature.controller.ts
├── feature.service.ts
├── feature.module.ts
└── feature.spec.ts
```

Não criar pastas vazias nem estruturas sem utilização.

---

## Nomenclatura

### Angular

- componentes: kebab-case nos ficheiros;
- classes de componentes: PascalCase;
- selectors: prefixo específico do projeto;
- services: sufixo `.service.ts`;
- guards: sufixo `.guard.ts`;
- interceptors: sufixo `.interceptor.ts`;
- pipes: sufixo `.pipe.ts`;
- directives: sufixo `.directive.ts`;
- specs: sufixo `.spec.ts`.

**Exemplo:**

```text
resource-card.component.ts
resource-card.component.html
resource-card.component.scss
resource-card.component.spec.ts
```

### NestJS

- ficheiros em kebab-case;
- classes em PascalCase;
- controllers com sufixo `Controller`;
- services com sufixo `Service`;
- modules com sufixo `Module`;
- guards com sufixo `Guard`;
- interceptors com sufixo `Interceptor`;
- filters com sufixo `Filter`;
- DTOs com sufixos claros, como `CreateResourceDto`.

### TypeScript

- variáveis: camelCase;
- funções: camelCase;
- constantes globais: `SCREAMING_SNAKE_CASE`;
- classes: PascalCase;
- tipos: PascalCase;
- interfaces: PascalCase;
- não utilizar prefixo `I` em interfaces;
- booleanos devem começar, quando apropriado, por `is`, `has`, `can`, `should` ou `was`;
- funções devem começar por verbos;
- nomes de coleções devem estar no plural;
- evitar abreviaturas pouco claras;
- não utilizar nomes genéricos como `data`, `item`, `obj` ou `result` quando existir um nome de domínio mais claro.

---

## SCSS e estilos

- utilizar SCSS;
- não utilizar Tailwind CSS;
- não utilizar estilos inline;
- não utilizar `!important` salvo exceção documentada;
- utilizar CSS custom properties para design tokens;
- centralizar cores, espaçamentos, tipografia, raios e sombras;
- manter estilos globais reduzidos;
- preferir estilos encapsulados nos componentes;
- não utilizar seletores excessivamente específicos;
- evitar nesting profundo;
- limitar o nesting a um máximo recomendado de três níveis;
- não selecionar elementos internos de outros componentes;
- não depender da estrutura HTML interna de bibliotecas;
- utilizar classes semânticas;
- evitar valores mágicos repetidos;
- respeitar os temas claro e escuro;
- respeitar `prefers-reduced-motion`;
- garantir contraste WCAG AA;
- não depender exclusivamente da cor para comunicar estados;
- não alterar os logótipos através de filtros CSS;
- não distorcer imagens institucionais.

**Estrutura indicativa:**

```text
styles/
├── _tokens.scss
├── _themes.scss
├── _typography.scss
├── _mixins.scss
├── _utilities.scss
└── styles.scss
```

Utilizar mixins apenas para padrões reutilizáveis reais. Não criar uma abstração SCSS para cada propriedade CSS.

---

## HTML e acessibilidade

- utilizar HTML semântico;
- manter uma hierarquia correta de títulos;
- utilizar `button` para ações;
- utilizar `a` para navegação;
- não utilizar `div` clicável quando existir um elemento nativo;
- associar labels a todos os campos;
- não utilizar apenas placeholders como labels;
- fornecer texto alternativo;
- utilizar texto alternativo vazio em imagens decorativas;
- ocultar ícones decorativos de tecnologias de apoio;
- garantir navegação por teclado;
- garantir foco visível;
- não remover outlines sem alternativa;
- devolver o foco após fechar diálogos;
- conter o foco em diálogos modais;
- utilizar regiões `aria-live` para mensagens importantes;
- associar erros aos campos;
- não depender apenas da cor;
- garantir alvos táteis adequados;
- utilizar ARIA apenas quando o HTML nativo não for suficiente;
- testar a aplicação com teclado;
- respeitar WCAG 2.2 AA.

---

## Pedidos HTTP e contratos da API

- utilizar uma API versionada;
- manter contratos previsíveis;
- utilizar os métodos HTTP adequados;
- utilizar códigos de estado corretos;
- não devolver sempre `200`;
- utilizar paginação em listagens;
- limitar campos de ordenação;
- validar todos os filtros;
- devolver datas num formato ISO consistente;
- não devolver hashes, tokens ou campos internos;
- não devolver entidades Prisma completas;
- utilizar respostas de erro consistentes;
- incluir identificador de correlação;
- não expor stack traces em produção;
- não expor caminhos internos;
- não expor mensagens de base de dados;
- não confiar em identificadores fornecidos pelo cliente para autorização;
- documentar endpoints através de OpenAPI.

**Formato conceptual de erro:**

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Não foi possível concluir o pedido.",
  "fieldErrors": {
    "subject": ["O assunto é obrigatório."]
  },
  "correlationId": "identificador",
  "timestamp": "2026-01-01T12:00:00.000Z"
}
```

---

## Tratamento de erros

### Frontend

- tratar erros previsíveis;
- apresentar mensagens em português de Portugal;
- não mostrar mensagens técnicas ao utilizador;
- utilizar toasts para confirmações breves;
- utilizar mensagens inline para erros de campos;
- utilizar estados próprios para erros de carregamento;
- permitir repetir uma operação quando apropriado;
- não ignorar erros;
- não imprimir dados sensíveis na consola;
- não utilizar `console.log` em produção;
- centralizar o tratamento de erros HTTP comuns;
- preservar mensagens específicas quando a API as disponibilizar de forma segura.

### Backend

- utilizar exception filters;
- utilizar exceções HTTP adequadas;
- mapear erros conhecidos do Prisma;
- não devolver erros crus;
- registar o erro com contexto seguro;
- incluir identificador de correlação;
- não registar palavras-passe, cookies ou tokens;
- distinguir erros funcionais de erros técnicos;
- utilizar `try/catch` apenas quando houver tratamento, compensação ou tradução de erro;
- não capturar exceções para as ignorar.

---

## Segurança

**Regras obrigatórias:**

- validar todas as entradas no backend;
- aplicar autenticação;
- aplicar autorização por função;
- aplicar autorização por recurso;
- impedir acesso horizontal entre utilizadores;
- proteger notas internas;
- proteger anexos;
- utilizar cookies `HttpOnly`;
- utilizar `Secure` em produção;
- aplicar uma política `SameSite` adequada;
- proteger contra CSRF quando aplicável;
- configurar CORS de forma restritiva;
- aplicar rate limiting;
- utilizar headers de segurança;
- aplicar Content Security Policy;
- não utilizar `innerHTML` com conteúdo não confiável;
- sanitizar apenas quando tecnicamente necessário;
- não concatenar entradas em consultas;
- não guardar segredos no código;
- validar variáveis de ambiente no arranque;
- não incluir ficheiros `.env` reais no repositório;
- não guardar palavras-passe, tokens ou cookies nos logs;
- não utilizar identificadores sequenciais como mecanismo de segurança;
- revogar sessões de utilizadores desativados;
- manter dependências atualizadas;
- analisar vulnerabilidades;
- documentar exceções de segurança.

> A interface nunca é uma fronteira de segurança. Todas as permissões devem ser verificadas novamente na API.

---

## Logs e auditoria

- utilizar logs estruturados;
- utilizar níveis de log;
- incluir identificador de correlação;
- não utilizar `console.log` como sistema de logging;
- não registar corpos completos de pedidos por defeito;
- mascarar informação sensível;
- separar logs técnicos de auditoria;
- registar ações administrativas relevantes;
- não utilizar auditoria para guardar conteúdo integral de documentos ou tickets;
- manter metadados mínimos;
- utilizar timestamps consistentes;
- não permitir que falhas de logging interrompam operações normais, salvo requisitos críticos.

---

## Qualidade do código

- não manter código comentado;
- remover imports não utilizados;
- remover variáveis não utilizadas;
- remover ficheiros sem utilização;
- não deixar `TODO` sem contexto;
- cada `TODO` aceite deve indicar motivo e referência de tarefa;
- manter funções pequenas;
- manter funções focadas;
- evitar mais de três ou quatro níveis de nesting;
- utilizar retornos antecipados quando melhorarem a legibilidade;
- não utilizar números ou textos mágicos repetidos;
- extrair constantes de domínio;
- não duplicar regras de negócio;
- não criar abstrações antes de existir repetição ou necessidade;
- preferir composição;
- documentar apenas decisões ou comportamentos não óbvios;
- não escrever comentários que repitam o código;
- manter nomes claros;
- não utilizar dependências sem necessidade;
- não adicionar bibliotecas para operações simples já suportadas pela plataforma;
- rever o impacto no bundle frontend;
- rever o impacto de novas dependências no backend.

> As funções devem permanecer suficientemente pequenas para serem compreendidas e testadas de forma isolada. O limite de 50 linhas é uma orientação, não um objetivo mecânico.

---

## Testes

### Princípios gerais

- testar comportamento e não detalhes de implementação;
- não criar testes que apenas confirmem mocks;
- utilizar dados determinísticos;
- evitar dependência da ordem de execução;
- limpar estado entre testes;
- não utilizar a base de dados de desenvolvimento nos testes;
- não utilizar serviços externos reais em testes automatizados;
- incluir testes positivos e negativos;
- testar permissões;
- testar validações;
- testar casos limite;
- corrigir testes instáveis em vez de os repetir automaticamente.

### Angular

Testar: renderização condicional; inputs e outputs; formulários; validações; filtros; estado; serviços; interceptors; guards; estados de carregamento; estados de erro; acessibilidade; navegação relevante.

### NestJS

Testar: controllers; services; DTOs; guards; autorização; tratamento de erros; transações; filtros; paginação; uploads; regras de negócio.

### Integração

- utilizar PostgreSQL isolado;
- aplicar migrações;
- testar constraints;
- testar transações;
- testar queries Prisma;
- testar armazenamento através de um ambiente isolado;
- não substituir todos os acessos por mocks quando o objetivo for testar integração.

### E2E

Utilizar Playwright para os fluxos principais: autenticação; consulta de recursos; pesquisa; filtros; abertura de vídeo; abertura de PDF; criação de ticket; resposta a ticket; nota interna; resolução; publicação de recurso; gestão de utilizadores; bloqueio de acessos indevidos.

### Acessibilidade

- integrar axe-core ou equivalente;
- testar teclado;
- testar foco;
- testar diálogos;
- testar formulários;
- testar acordeões;
- testar menus;
- validar contraste manualmente quando necessário.

---

## Lint, formatação e validação

- ESLint para frontend e backend;
- Prettier para formatação;
- regras consistentes no monorepo;
- formatação automática antes do commit quando configurada;
- verificação obrigatória no CI;
- proibição de warnings ignorados indefinidamente;
- TypeScript estrito;
- build obrigatório;
- testes obrigatórios;
- validação de migrações.

**Antes de um pull request, executar:**

```text
lint
format:check
typecheck
test
build
prisma migrate status
```

Adapta os nomes aos scripts reais do projeto.

---

## Git e pull requests

- uma branch por funcionalidade ou correção;
- nomes de branch claros;
- commits pequenos e coerentes;
- não incluir ficheiros gerados desnecessários;
- não incluir segredos;
- não misturar refatorações extensas com alterações funcionais sem necessidade;
- descrever o problema e a solução no pull request;
- indicar migrações;
- indicar alterações de variáveis de ambiente;
- incluir instruções de teste;
- incluir capturas de ecrã para alterações visuais;
- incluir impacto de acessibilidade;
- exigir revisão antes do merge;
- não integrar código com testes falhados;
- não integrar migrações inconsistentes.

**Exemplos:**

```text
feature/resource-catalog
feature/support-tickets
fix/ticket-authorization
refactor/resource-filters
chore/update-angular
```

---

## Documentação

- atualizar `README.md` quando os passos de instalação mudarem;
- atualizar `project-spec.md` quando os requisitos mudarem;
- atualizar OpenAPI quando a API mudar;
- documentar variáveis de ambiente;
- documentar migrações relevantes;
- criar ADRs para decisões arquiteturais importantes;
- manter exemplos atualizados;
- não documentar funcionalidades ainda inexistentes como concluídas;
- marcar claramente funcionalidades previstas;
- escrever documentação em português de Portugal, salvo documentação técnica que exija terminologia padronizada.

---

## Dependências

- preferir APIs nativas do Angular, NestJS, Node.js e browser;
- avaliar manutenção;
- avaliar licença;
- avaliar tamanho;
- avaliar segurança;
- avaliar compatibilidade;
- evitar bibliotecas abandonadas;
- evitar várias bibliotecas para a mesma finalidade;
- bloquear versões através do lockfile;
- não atualizar dependências principais sem executar testes;
- não utilizar versões beta, RC ou experimentais sem decisão explícita;
- documentar dependências críticas;
- remover dependências não utilizadas.

---

## Desempenho

### Frontend

- utilizar lazy loading;
- evitar bundles excessivos;
- otimizar imagens;
- utilizar miniaturas;
- não carregar PDFs ou vídeos antes de serem necessários;
- cancelar pesquisas anteriores;
- utilizar `track` adequado em listas;
- evitar renders desnecessários;
- não efetuar pedidos duplicados;
- utilizar paginação;
- utilizar skeletons em carregamentos relevantes.

### Backend

- utilizar paginação;
- limitar resultados;
- selecionar apenas campos necessários;
- utilizar índices;
- evitar N+1;
- evitar serialização excessiva;
- não manter transações abertas durante uploads;
- utilizar streaming ou acesso direto temporário para ficheiros grandes;
- medir antes de introduzir cache;
- não utilizar Redis sem uma necessidade demonstrada.

---

## Internacionalização e conteúdo

- utilizar português de Portugal;
- utilizar `pt-PT`;
- centralizar textos da interface;
- não espalhar textos de domínio por componentes;
- formatar datas e horas segundo a localização;
- armazenar datas em UTC;
- evitar português do Brasil;
- utilizar "utilizador";
- utilizar "palavra-passe";
- utilizar "ficheiro";
- utilizar "ecrã";
- utilizar "iniciar sessão";
- manter mensagens claras e institucionais;
- não inventar procedimentos, contactos ou regras da DGADR.

---

## Regras proibitivas

- não utilizar `any`;
- não utilizar `prisma db push` em ambientes partilhados ou de produção;
- não alterar diretamente a base de dados sem migração;
- não utilizar React;
- não utilizar Next.js;
- não utilizar Tailwind CSS;
- não utilizar SSR ou SSG no MVP;
- não implementar pagamentos;
- não criar registo público;
- não guardar ficheiros binários no PostgreSQL;
- não expor buckets ou objetos privados;
- não confiar no frontend para segurança;
- não guardar segredos no repositório;
- não mostrar stack traces ao utilizador;
- não utilizar código comentado;
- não deixar botões sem funcionalidade;
- não apresentar dados demonstrativos como oficiais;
- não desativar regras TypeScript para concluir uma tarefa;
- não ignorar testes falhados;
- não concluir uma funcionalidade sem tratar carregamento, erro, vazio e sucesso.

---

## Definição de concluído

Uma alteração só pode ser considerada concluída quando:

- cumpre os requisitos;
- respeita estas normas;
- compila;
- passa no lint;
- passa na verificação TypeScript;
- tem testes adequados;
- não reduz a segurança;
- não introduz erros de acessibilidade;
- trata estados de carregamento e erro;
- inclui migração quando altera dados;
- atualiza documentação;
- não inclui código morto;
- não inclui segredos;
- foi revista;
- funciona nos tamanhos de ecrã aplicáveis;
- não gera erros relevantes na consola ou nos logs.

---

> Estas normas existem para manter o Filedoc Recursos Formativos seguro, sustentável, acessível e consistente. Exceções devem ser raras, justificadas e documentadas.
