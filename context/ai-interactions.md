# Diretrizes de Interação com Agentes de IA

Estas diretrizes definem como agentes de inteligência artificial devem colaborar no desenvolvimento do **Filedoc Recursos Formativos**.

Aplicam-se a todas as tarefas relacionadas com:

- frontend Angular;
- backend NestJS;
- Prisma;
- PostgreSQL;
- armazenamento MinIO ou S3;
- autenticação e autorização;
- recursos formativos;
- pedidos de suporte;
- gestão editorial;
- administração;
- testes;
- documentação;
- Docker;
- CI/CD;
- segurança;
- acessibilidade.

As regras deste documento complementam:

- `project-overview.md`;
- `project-spec.md`;
- `coding-standards.md`;
- documentação existente no repositório.

Em caso de conflito, o agente deve parar, identificar o conflito e solicitar uma decisão antes de executar alterações irreversíveis.

---

## Comunicação

O agente deve:

- comunicar em português de Portugal;
- ser direto e objetivo;
- explicar brevemente decisões técnicas não evidentes;
- indicar claramente o que pretende alterar antes de alterações extensas;
- distinguir factos, decisões confirmadas e pressupostos;
- não inventar requisitos;
- não inventar integrações institucionais;
- não inventar APIs, contactos, domínios ou credenciais da DGADR;
- não acrescentar funcionalidades que não estejam na especificação;
- não ocultar erros, limitações ou tarefas incompletas;
- não afirmar que algo foi testado quando não foi executado;
- não declarar uma funcionalidade concluída apenas porque compila;
- apresentar erros de forma clara, incluindo o comando executado e o resultado relevante;
- evitar respostas excessivamente longas quando uma confirmação simples for suficiente.

Quando uma decisão puder afetar significativamente:

- arquitetura;
- modelo de dados;
- segurança;
- autenticação;
- estrutura do repositório;
- deployment;
- compatibilidade;
- migrações;
- experiência do utilizador;

o agente deve pedir autorização antes de avançar.

---

## Fontes de verdade

Antes de iniciar uma tarefa, o agente deve consultar, por esta ordem:

1. pedido atual do utilizador;
2. `context/current-feature.md`;
3. `project-spec.md`;
4. `project-overview.md`;
5. `coding-standards.md`;
6. `ai-interaction.md`;
7. código e testes existentes;
8. documentação oficial das tecnologias, quando necessária.

**Regras:**

- o pedido atual prevalece quando altera explicitamente uma decisão anterior;
- alterações de requisitos devem ser refletidas na documentação;
- o agente não deve assumir que documentação desatualizada continua correta;
- o código existente não deve ser considerado automaticamente correto apenas porque já está implementado;
- decisões críticas devem ser confirmadas através da especificação ou de uma instrução explícita.

---

## Âmbito da tarefa

Antes de alterar código, o agente deve identificar:

- objetivo;
- problema a resolver;
- ficheiros potencialmente afetados;
- requisitos funcionais;
- requisitos não funcionais;
- riscos;
- critérios de aceitação;
- comandos de validação;
- necessidade de migração;
- impacto na API;
- impacto na interface;
- impacto em segurança;
- impacto em acessibilidade.

O agente deve executar apenas o necessário para concluir a tarefa.

**Não deve:**

- realizar refatorações não relacionadas;
- alterar convenções estáveis sem necessidade;
- atualizar dependências sem relação com a tarefa;
- alterar estilos globais para corrigir um componente isolado;
- modificar contratos públicos sem avaliar compatibilidade;
- reorganizar pastas apenas por preferência pessoal;
- acrescentar funcionalidades "interessantes" ou "úteis" não solicitadas.

---

## Fluxo de trabalho obrigatório

Utiliza o seguinte fluxo para cada funcionalidade, correção, refatoração ou tarefa técnica.

### 1. Compreender

Antes de alterar ficheiros:

- ler o pedido completo;
- consultar a documentação relevante;
- identificar o comportamento atual;
- confirmar os critérios de aceitação;
- identificar dependências e riscos;
- procurar padrões semelhantes já existentes no projeto.

Quando os requisitos forem ambíguos ou contraditórios, perguntar antes de implementar.

---

### 2. Documentar a tarefa

Criar ou atualizar:

```text
context/current-feature.md
```

O documento deve incluir:

- título;
- tipo de tarefa;
- objetivo;
- contexto;
- requisitos;
- fora do âmbito;
- ficheiros previstos;
- decisões técnicas;
- riscos;
- plano de implementação;
- testes previstos;
- critérios de aceitação;
- estado;
- histórico resumido.

**Estados permitidos:**

- `PLANEADA`;
- `EM_DESENVOLVIMENTO`;
- `BLOQUEADA`;
- `EM_VALIDAÇÃO`;
- `CONCLUÍDA`.

Não marcar como concluída antes da validação final.

Para correções pequenas e urgentes, o documento pode ser mais curto, mas não deve omitir objetivo, causa, alteração e validação.

---

### 3. Criar uma branch

Utilizar uma branch por funcionalidade, correção ou refatoração.

**Formatos:**

```text
feature/nome-da-funcionalidade
fix/nome-da-correcao
refactor/nome-da-refatoracao
chore/nome-da-tarefa
docs/nome-da-documentacao
test/nome-dos-testes
```

**Exemplos:**

```text
feature/resource-catalog
feature/support-tickets
fix/ticket-authorization
fix/pdf-download-permission
refactor/resource-filters
docs/update-authentication-flow
test/ticket-access-control
```

**Regras:**

- utilizar kebab-case;
- escolher nomes curtos e claros;
- não trabalhar diretamente em `main`;
- não reutilizar uma branch para tarefas não relacionadas;
- não criar uma branch sem verificar o estado atual do repositório;
- não mudar de branch quando existirem alterações locais não compreendidas;
- não eliminar uma branch sem autorização.

Quando o agente não tiver permissão ou capacidade para criar a branch, deve apresentar o comando recomendado, sem afirmar que foi executado.

---

### 4. Planear a implementação

Antes de escrever código, definir uma sequência curta e verificável.

O plano deve considerar, quando aplicável:

- contratos da API;
- DTOs;
- validação;
- autorização;
- esquema Prisma;
- migração;
- serviços;
- controllers;
- componentes Angular;
- formulários;
- estados da interface;
- acessibilidade;
- armazenamento de ficheiros;
- testes;
- documentação.

O agente deve preferir alterações incrementais.

Para alterações grandes, deve dividir o trabalho em etapas que possam ser validadas de forma independente.

---

### 5. Implementar

Durante a implementação:

- seguir `coding-standards.md`;
- preservar os padrões existentes;
- manter alterações focadas;
- utilizar TypeScript estrito;
- não utilizar `any`;
- não criar código morto;
- não deixar código comentado;
- não introduzir dependências sem necessidade;
- não ignorar erros do compilador;
- não desativar regras de lint;
- não omitir estados de carregamento, erro, vazio e sucesso;
- não confiar no frontend para autorização;
- validar dados no backend;
- escrever testes relevantes à medida que a funcionalidade evolui;
- atualizar documentação quando contratos ou comportamentos mudarem.

O agente deve preferir corrigir a causa do problema em vez de esconder o sintoma.

---

### 6. Rever localmente

Antes de executar a validação automatizada, rever:

- alterações inesperadas;
- imports não utilizados;
- ficheiros alterados sem necessidade;
- nomes;
- duplicação;
- regras de autorização;
- possíveis fugas de dados;
- tratamento de erros;
- acessibilidade;
- comportamento responsivo;
- migrações;
- documentação.

Utilizar o diff do Git para confirmar o âmbito das alterações.

Não avançar se existirem alterações de origem desconhecida.

---

### 7. Testar

Executar os testes aplicáveis à tarefa.

A validação mínima deve incluir, conforme a área alterada:

```text
lint
format:check
typecheck
test
build
```

Quando existirem alterações na base de dados:

```text
prisma format
prisma validate
prisma migrate status
```

Quando existirem alterações funcionais críticas:

```text
test:e2e
```

Quando existirem alterações visuais ou de interação:

- verificar no browser;
- testar desktop;
- testar telemóvel;
- testar teclado;
- testar foco;
- testar modo claro;
- testar modo escuro;
- testar estados de erro;
- testar estados vazios;
- testar redução de movimento quando aplicável.

Adaptar os nomes aos scripts reais do projeto.

O agente não deve inventar resultados. Deve registar:

- comandos executados;
- resultado;
- falhas;
- avisos relevantes;
- validações manuais efetuadas.

---

### 8. Corrigir falhas

Quando um comando falhar:

1. ler a mensagem completa;
2. identificar a causa provável;
3. corrigir a causa;
4. repetir o comando relevante;
5. repetir a validação global quando necessário.

**Não deve:**

- ignorar a falha;
- comentar testes;
- desativar validações;
- remover regras de lint;
- converter tipos para `any`;
- apagar código funcional sem compreender o impacto;
- substituir uma solução por um atalho inseguro.

---

### 9. Iterar

Depois da primeira implementação:

- comparar o resultado com os critérios de aceitação;
- verificar casos limite;
- rever segurança;
- rever acessibilidade;
- rever desempenho;
- rever consistência com o projeto;
- corrigir discrepâncias;
- voltar a executar os testes afetados.

Evitar ciclos de alterações aleatórias.

Cada iteração deve ser orientada por:

- uma falha observável;
- um requisito;
- um teste;
- um problema concreto.

---

### 10. Solicitar validação

Antes de um commit, apresentar ao utilizador:

- resumo das alterações;
- ficheiros principais alterados;
- decisões tomadas;
- testes executados;
- resultado da build;
- migrações criadas;
- riscos ou limitações;
- elementos ainda não validados manualmente.

Solicitar autorização para criar o commit.

Não assumir autorização implícita.

---

### 11. Criar commit

Só criar um commit quando:

- o utilizador autorizar;
- a build passar;
- os testes relevantes passarem;
- a tarefa estiver funcional;
- o diff tiver sido revisto;
- não existirem segredos;
- não existirem alterações alheias à tarefa;
- a documentação estiver atualizada.

Não criar commits automaticamente.

---

### 12. Merge

Não efetuar merge sem autorização explícita.

Antes do merge:

- confirmar que a branch está atualizada;
- confirmar que a pipeline passa;
- confirmar que as migrações são aplicáveis;
- confirmar que não existem conflitos;
- apresentar o método de merge recomendado.

Não fazer force push para resolver conflitos sem autorização.

---

### 13. Eliminar a branch

Depois do merge:

- confirmar que a integração foi concluída;
- perguntar se a branch deve ser eliminada;
- não eliminar branches locais ou remotas sem autorização;
- não eliminar branches com trabalho não integrado.

---

### 14. Atualizar histórico

Após conclusão confirmada:

- marcar `context/current-feature.md` como `CONCLUÍDA`;
- registar um resumo do resultado;
- registar testes executados;
- registar a referência do commit ou pull request, quando disponível;
- mover ou copiar o resumo para o histórico definido pelo projeto.

Não apagar o contexto anterior sem preservar o histórico relevante.

---

## Regras de branching

Cada branch deve representar uma única unidade coerente de trabalho.

Não combinar na mesma branch:

- nova funcionalidade;
- atualização geral de dependências;
- refatoração extensa;
- reformulação visual não relacionada;
- correção de segurança distinta.

Antes de criar uma branch:

- verificar a branch atual;
- verificar alterações locais;
- atualizar referências remotas quando autorizado;
- confirmar o ponto de partida.

O agente deve avisar quando uma branch contiver alterações que não pertencem à tarefa.

---

## Commits

Utilizar Conventional Commits.

**Prefixos permitidos:**

- `feat:`;
- `fix:`;
- `refactor:`;
- `test:`;
- `docs:`;
- `chore:`;
- `perf:`;
- `build:`;
- `ci:`;
- `style:` apenas para formatação sem alteração funcional.

**Exemplos:**

```text
feat: adicionar catálogo de recursos
fix: impedir acesso a tickets de outros utilizadores
refactor: simplificar filtros do catálogo
test: cobrir autorização de notas internas
docs: atualizar fluxo de autenticação
chore: configurar validação do Prisma
```

**Regras:**

- pedir autorização antes de criar o commit;
- manter cada commit focado;
- utilizar mensagens claras;
- descrever o efeito da alteração;
- evitar mensagens vagas como `update`, `changes` ou `fix stuff`;
- não incluir nomes de ferramentas de IA;
- não incluir "Generated with AI";
- não incluir "Generated with Claude";
- não incluir mensagens promocionais;
- não incluir coautoria automática de agentes de IA;
- não incluir segredos;
- não fazer amend, squash ou rebase sem autorização quando isso alterar histórico partilhado.

---

## Migrações Prisma

Alterações ao esquema da base de dados exigem atenção especial.

O agente deve:

- explicar a alteração proposta;
- identificar impacto nos dados existentes;
- criar uma migração versionada;
- utilizar um nome descritivo;
- rever o SQL;
- testar numa base de dados limpa;
- validar compatibilidade com dados existentes;
- executar `prisma migrate status`;
- atualizar seeds quando necessário;
- atualizar documentação.

**É proibido:**

- utilizar `prisma db push` em ambientes partilhados ou de produção;
- alterar diretamente a estrutura da base de dados;
- editar migrações já aplicadas;
- eliminar migrações versionadas;
- executar `prisma migrate reset` sem autorização;
- aplicar migrações de produção sem autorização;
- apagar dados para facilitar uma migração;
- tornar um campo obrigatório sem estratégia para dados existentes.

Antes de uma migração potencialmente destrutiva, o agente deve parar e pedir autorização.

**Exemplos de alterações destrutivas:**

- remoção de tabela;
- remoção de coluna;
- mudança incompatível de tipo;
- remoção de valores de enum;
- alteração de relações;
- mudança de comportamento de eliminação;
- criação de constraint que possa falhar com dados atuais.

---

## Alterações a ficheiros

O agente não deve eliminar, mover ou renomear ficheiros sem confirmar:

- que não são utilizados;
- que não são referenciados;
- que a alteração faz parte do âmbito;
- que os imports serão atualizados;
- que os testes continuam a passar.

**Deve pedir autorização antes de:**

- eliminar ficheiros;
- eliminar pastas;
- mover grandes áreas;
- renomear módulos públicos;
- substituir configurações;
- reestruturar o monorepo;
- remover dependências importantes;
- eliminar testes;
- apagar migrações;
- alterar ficheiros de deployment.

Não sobrescrever ficheiros de configuração sem preservar opções relevantes existentes.

---

## Alterações arquiteturais

**Consideram-se alterações arquiteturais:**

- substituir Angular;
- substituir NestJS;
- substituir Prisma;
- substituir PostgreSQL;
- alterar o modelo de autenticação;
- introduzir microserviços;
- introduzir uma biblioteca global de estado;
- introduzir Redis;
- introduzir filas;
- alterar o armazenamento de ficheiros;
- ativar SSR ou SSG;
- separar ou fundir repositórios;
- alterar a estratégia de deployment;
- alterar a estrutura principal da API;
- alterar o modelo de permissões.

O agente deve:

1. identificar o problema;
2. apresentar a motivação;
3. apresentar impacto;
4. apresentar alternativas;
5. indicar riscos;
6. solicitar decisão.

Não implementar a alteração antes da autorização.

---

## Alterações de dependências

Antes de instalar uma dependência, avaliar:

- necessidade;
- existência de solução nativa;
- manutenção;
- licença;
- segurança;
- dimensão;
- impacto no bundle;
- compatibilidade;
- frequência de atualização;
- suporte TypeScript.

**O agente deve pedir autorização antes de:**

- adicionar uma dependência de produção;
- remover uma dependência importante;
- atualizar uma versão principal;
- instalar uma biblioteca de UI;
- instalar uma biblioteca de estado;
- instalar uma biblioteca de autenticação;
- alterar Prisma, Angular ou NestJS para uma versão principal diferente.

Não utilizar versões beta, RC ou experimentais sem autorização explícita.

---

## Quando os requisitos não forem claros

O agente deve pedir esclarecimento quando uma ambiguidade afetar:

- dados;
- permissões;
- segurança;
- comportamento funcional;
- experiência do utilizador;
- modelo de dados;
- compatibilidade;
- integrações;
- deployment.

**Para detalhes secundários, deve seguir:**

1. padrões existentes;
2. especificação;
3. normas de código;
4. solução mínima e reversível.

Deve documentar o pressuposto adotado.

Não deve transformar um detalhe em falta numa nova funcionalidade.

---

## Quando o agente ficar bloqueado

Se a mesma abordagem falhar duas ou três vezes:

- parar;
- não continuar com alterações aleatórias;
- resumir o que foi tentado;
- apresentar os erros relevantes;
- explicar a causa provável;
- identificar o que falta;
- propor uma ou duas opções;
- solicitar orientação.

**O agente não deve:**

- repetir indefinidamente o mesmo comando;
- instalar dependências ao acaso;
- desativar segurança;
- apagar configurações;
- alterar versões sem justificação;
- recriar o projeto;
- eliminar dados;
- esconder a falha.

---

## Alterações mínimas

Aplicar o princípio da menor alteração suficiente.

**O agente deve:**

- modificar apenas ficheiros necessários;
- preservar contratos quando possível;
- manter padrões existentes;
- evitar reformatação global;
- evitar renomeações sem benefício;
- evitar abstrações prematuras;
- não reescrever uma funcionalidade funcional para seguir uma preferência pessoal;
- não misturar melhorias opcionais com o requisito principal.

Refatorações relacionadas podem ser realizadas quando forem necessárias para:

- corrigir um problema;
- garantir segurança;
- permitir testes;
- remover duplicação diretamente ligada à tarefa;
- cumprir uma norma obrigatória.

Refatorações mais amplas exigem autorização.

---

## Segurança

A revisão de qualquer alteração deve verificar:

- autenticação;
- autorização por função;
- autorização por recurso;
- acesso horizontal;
- validação de entrada;
- exposição de dados;
- tratamento de ficheiros;
- proteção de notas internas;
- proteção de anexos;
- cookies;
- CSRF;
- CORS;
- XSS;
- injeção;
- rate limiting;
- logs;
- segredos;
- mensagens de erro.

> A interface nunca é uma fronteira de segurança. Todas as permissões devem ser verificadas na API.

**Para tickets:**

- trabalhadores apenas consultam os próprios pedidos;
- trabalhadores não consultam notas internas;
- anexos exigem autorização;
- referências não substituem autorização;
- agentes de suporte apenas executam ações permitidas;
- utilizadores desativados perdem acesso.

Alterações relacionadas com autenticação ou autorização devem incluir testes negativos.

---

## Privacidade

O agente deve verificar se a alteração:

- recolhe novos dados;
- expõe novos dados;
- altera retenção;
- altera logs;
- cria exportações;
- adiciona integrações externas;
- altera acesso a anexos;
- altera auditoria.

**Não adicionar, sem requisito e autorização explícitos:**

- rastreamento;
- analytics externo;
- monitorização de utilizadores;
- recolha de dados pessoais;
- envio de dados para terceiros.

**Não utilizar dados reais da DGADR em:**

- seeds;
- testes;
- capturas;
- documentação;
- exemplos;
- logs.

---

## Acessibilidade

Alterações de interface devem ser revistas quanto a:

- semântica;
- teclado;
- foco;
- labels;
- mensagens de erro;
- contraste;
- leitores de ecrã;
- redução de movimento;
- estados não dependentes apenas da cor;
- tamanho dos alvos;
- responsividade;
- zoom.

**O agente não deve considerar uma funcionalidade visual concluída sem verificar:**

- foco visível;
- navegação por teclado;
- comportamento em dispositivos móveis;
- estados de carregamento;
- estados de erro;
- estados vazios;
- modo claro;
- modo escuro.

Quando utilizar Angular Material ou CDK, deve confirmar que a configuração mantém a acessibilidade esperada.

---

## Desempenho

A revisão de código gerado por IA deve procurar:

- pedidos HTTP duplicados;
- subscrições não libertadas;
- cálculos executados repetidamente no template;
- renderizações desnecessárias;
- carregamento antecipado de vídeos ou PDFs;
- listas sem paginação;
- queries sem índices;
- consultas N+1;
- relações Prisma carregadas sem necessidade;
- respostas excessivas;
- transações longas;
- ficheiros carregados através da API sem necessidade;
- dependências pesadas.

Não introduzir cache, Redis ou otimizações complexas sem medir primeiro e demonstrar necessidade.

---

## Revisão de código gerado por IA

O código criado ou alterado por IA deve ser revisto periodicamente e sempre que solicitado.

A revisão deve avaliar:

### Correção

- cumpre o requisito;
- trata casos limite;
- não quebra comportamentos existentes;
- mantém contratos.

### Segurança

- verifica autenticação;
- verifica autorização;
- valida entradas;
- protege dados;
- não expõe notas internas;
- não expõe anexos;
- não regista segredos.

### Desempenho

- evita pedidos duplicados;
- evita N+1;
- utiliza paginação;
- não carrega dados excessivos;
- não cria efeitos ou subscrições desnecessários.

### Arquitetura

- respeita os módulos existentes;
- não cria acoplamento indevido;
- não duplica regras;
- não introduz abstrações sem utilidade;
- mantém fronteiras entre frontend, backend e persistência.

### Qualidade

- utiliza nomes claros;
- não utiliza `any`;
- não contém código morto;
- não contém comentários redundantes;
- tem testes;
- tem tratamento de erros;
- respeita a documentação.

### UX e acessibilidade

- apresenta feedback;
- trata carregamento;
- trata erro;
- trata vazio;
- funciona por teclado;
- mantém foco;
- funciona em dispositivos móveis.

---

## Verificação de código existente

Antes de adicionar uma solução, o agente deve procurar:

- componentes existentes;
- serviços existentes;
- DTOs existentes;
- validadores existentes;
- utilitários existentes;
- padrões de erro;
- padrões de paginação;
- guards existentes;
- mecanismos de auditoria;
- componentes de feedback;
- tokens visuais.

Não duplicar uma solução existente apenas porque não foi localizada inicialmente.

---

## Validação no browser

Para alterações frontend, validar no browser sempre que o ambiente o permitir.

**Verificar:**

- rota correta;
- navegação;
- conteúdo;
- formulários;
- validação;
- estados;
- mensagens;
- modo claro;
- modo escuro;
- responsividade;
- consola;
- pedidos de rede;
- acessibilidade por teclado.

Se o agente não conseguir executar o browser, deve indicar claramente que a validação visual ficou pendente.

Não deve afirmar que "funciona no browser" apenas porque a build passou.

---

## Validação da API

Para alterações backend, verificar:

- código de estado;
- corpo da resposta;
- autenticação;
- autorização;
- validação;
- erros;
- paginação;
- filtros;
- efeitos na base de dados;
- auditoria;
- acesso a ficheiros.

Testar caminhos positivos e negativos.

**Exemplos de testes negativos:**

- pedido sem autenticação;
- função incorreta;
- acesso a recurso de outro utilizador;
- campo inválido;
- identificador inexistente;
- ficheiro não permitido;
- utilizador desativado.

---

## Dados e ambientes

O agente deve distinguir claramente:

- desenvolvimento;
- teste;
- homologação;
- produção.

**Não deve:**

- executar seeds demonstrativos em produção;
- utilizar dados reais de trabalhadores da DGADR em ambientes de desenvolvimento ou teste;
- copiar dados de produção para outros ambientes sem autorização e sem anonimização;
- aplicar migrações destrutivas fora do ambiente para o qual foram validadas;
- assumir que um comando é seguro apenas por já ter sido executado noutro ambiente;
- utilizar credenciais, segredos ou variáveis de ambiente de produção em desenvolvimento ou testes;
- confundir bases de dados de teste automatizado com bases de dados de desenvolvimento local;
- eliminar ou repor dados de um ambiente sem confirmar previamente qual o ambiente ativo.

Antes de qualquer operação que altere dados ou estrutura fora do ambiente local, o agente deve confirmar explicitamente o ambiente-alvo e obter autorização.

---

## Resumo do fluxo obrigatório

Para cada tarefa, o agente deve seguir sempre esta sequência: compreender, documentar, criar branch, planear, implementar, rever localmente, testar, corrigir falhas, iterar, solicitar validação, obter autorização para o commit, obter autorização para o merge, obter autorização para eliminar a branch, e atualizar o histórico da tarefa.

Nenhuma etapa que envolva persistência de código (commit), integração (merge), eliminação de branches, ou alteração de dados, deve ocorrer sem autorização explícita do utilizador.

---

> Estas diretrizes existem para que a colaboração com agentes de IA no Filedoc Recursos Formativos seja previsível, segura e reversível. Perante dúvida, o agente deve parar e perguntar, em vez de assumir e avançar.
