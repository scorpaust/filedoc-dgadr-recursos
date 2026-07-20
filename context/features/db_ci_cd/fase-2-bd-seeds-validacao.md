# Fase 2 (BD) — Seeds e Validação de Dados

Esta especificação define a **segunda fase da via de Base de Dados e Deployment Inicial** do **Filedoc Recursos Formativos**.

Assume como ponto de partida a Fase 1 (BD) — Modelo de Dados Completo, já concluída: schema Prisma completo, migrado, com todas as entidades, enums, índices e decisões de `onDelete` documentadas.

Coerente com `project-spec.md` ("Regras do modelo de dados" — seeds apenas para desenvolvimento/configuração inicial), `coding-standards.md` (secção "Seeds") e `ai-interaction.md`.

---

## Objetivo

No final desta fase, deve ser possível:

- executar `prisma db seed` (ou equivalente) contra uma base de dados de desenvolvimento vazia e obter um conjunto de dados coerente e representativo, cobrindo todas as entidades da Fase 1;
- executar o mesmo comando repetidamente sem duplicar dados nem falhar (idempotência);
- consultar, com queries Prisma reais (não mock), os cenários de pesquisa, filtro e paginação previstos em `project-spec.md` para o catálogo, os tickets e a gestão de utilizadores, com resultados corretos e sem consultas N+1;
- confirmar, com dados reais na base de dados, os comportamentos já garantidos estruturalmente na Fase 1 (bloqueio de eliminação de taxonomia em uso, restrição de último `ADMIN`, unicidade de `slug`/`reference`/`email`).

Não existe nesta fase: endpoints da API nem lógica de negócio exposta via HTTP — as queries desta fase são validadas diretamente (scripts, testes de integração contra o Prisma Client, ou consola), não através de uma API ainda inexistente.

---

## Âmbito

### Incluído

- Seed de taxonomias (`Workflow`, `DocumentType`, `Tag`) com os valores iniciais de `project-spec.md`;
- Seed de utilizadores de desenvolvimento, com **múltiplas funções** representadas (incluindo pelo menos um utilizador com duas funções em simultâneo, replicando o cenário já validado na via de UI), palavras-passe de desenvolvimento com hash real (Argon2id ou equivalente, mesmo sendo dados de desenvolvimento — nunca palavras-passe em texto simples, mesmo aqui);
- Seed de recursos de exemplo (vídeos e guias), cobrindo todos os estados editoriais, dificuldades e fluxos, coerente com os dados mock já validados na via de UI (`docs/interfaces-mock-ui.md`);
- Seed de dicas e perguntas frequentes de exemplo;
- Seed de pedidos de suporte de exemplo, cobrindo vários estados, prioridades e categorias, com mensagens públicas e notas internas;
- Scripts ou testes de integração que validem queries reais: paginação do catálogo, filtros combinados, listagem de tickets por solicitante/agente, listagem de utilizadores por função;
- Verificação prática (não apenas estrutural) das restrições de negócio críticas: eliminar uma taxonomia em uso falha; remover `ADMIN` do último utilizador com essa função falha; criar dois recursos com o mesmo `slug` falha.

### Fora de âmbito

- Endpoints NestJS (via de integração de funcionalidades, mais adiante);
- Dados de produção ou de homologação — esta fase é exclusivamente para desenvolvimento local e para as bases de dados de teste de integração;
- Otimizações de desempenho além da prevenção de N+1 já expressável com `select`/`include` do Prisma (medição de desempenho sob carga fica para quando existir API real e tráfego real).

---

## Entregáveis

1. Script(s) de seed idempotentes, organizados por entidade ou por grupo coerente;
2. Conjunto de dados de desenvolvimento suficientemente representativo (todas as combinações relevantes de estado, função, tipo);
3. Testes de integração (ou scripts de validação) que exercitam as queries típicas do produto;
4. Confirmação prática das restrições de negócio críticas.

---

## Tarefas

### A. Seed de taxonomias

- `Workflow`: os oito fluxos de `project-spec.md` (Criação e registo, Correspondência, Tramitação, Assinatura, Pesquisa, Gestão documental, Arquivo, Correções), todos ativos, com `sortOrder` definido;
- `DocumentType`: os sete tipos de documento de `project-spec.md` (Informação, Ofício, Despacho, Processo, Correspondência, Anexo, Diversos);
- `Tag`: um conjunto inicial razoável (10–15), cobrindo termos genéricos de exemplo, sem inventar terminologia institucional não confirmada;
- Seed idempotente: usar `upsert` por `slug`, nunca `create` direto (que falharia ou duplicaria em execuções repetidas).

### B. Seed de utilizadores de desenvolvimento

- Um utilizador por função (`EMPLOYEE`, `CONTENT_EDITOR`, `SUPPORT_AGENT`, `ADMIN`), mais pelo menos:
  - um utilizador com duas funções em simultâneo (ex.: `CONTENT_EDITOR` + `ADMIN`);
  - dois utilizadores `ADMIN`, para permitir testar a remoção de função/desativação de um deles sem violar a regra do último administrador;
  - um utilizador inativo, para validar o bloqueio de login;
- Palavras-passe de desenvolvimento simples mas com hash real (nunca reutilizar as mesmas credenciais em qualquer ambiente que não seja local);
- Nomes e e-mails claramente fictícios (nunca nomes ou e-mails reais de trabalhadores da DGADR);
- Seed idempotente por `email` (`upsert`).

### C. Seed de recursos, dicas e FAQ

- Recursos: cobrir vídeo e guia, os três níveis de dificuldade, pelo menos um exemplo por fluxo, e os três estados editoriais (incluindo arquivados, para validar que nunca aparecem no catálogo);
- Reutilizar os textos de exemplo já validados na via de UI (títulos, resumos, descrições), para manter coerência entre o que foi prototipado e o que agora existe em base de dados real;
- Dicas e perguntas frequentes: os exemplos já validados em `project-spec.md` e no protótipo, mais alguns adicionais para cobrir categorias diferentes;
- Ficheiros associados (vídeo/PDF/miniatura): nesta fase, apenas referências (`fileObjectKey`, etc.) simbólicas — o armazenamento real (MinIO) só é testado a partir da fase de integração de funcionalidades; não é necessário nenhum ficheiro binário real nesta fase de seed.

### D. Seed de pedidos de suporte

- Vários pedidos cobrindo todos os estados, prioridades e categorias de `project-spec.md`;
- Pelo menos um pedido com histórico completo: mensagem de criação, mensagem pública do trabalhador, nota interna do agente, resposta pública do agente, resolução e confirmação;
- Referências (`reference`) geradas no formato `SUP-AAAA-XXXXXX`, únicas, com a parte aleatória gerada por um mecanismo não sequencial (mesmo em seed, para já habituar o padrão).

### E. Validação de queries reais

Escrever testes de integração (contra uma base de dados de teste, com as migrações aplicadas e os seeds executados, ou um subconjunto equivalente) que confirmem:

- **Catálogo**: pesquisa por texto, filtro por tipo/fluxo/dificuldade, paginação com `skip`/`take`, ordenação por data de publicação e alfabética — usando `select` para devolver apenas os campos necessários, nunca a entidade completa sem necessidade;
- **Prevenção de N+1**: ao listar recursos com o fluxo e o tipo de documento associados, confirmar que é usada uma única query com `include`/`select` adequados, não uma query por recurso;
- **Tickets**: listagem por solicitante (vista do trabalhador) e listagem completa com filtros (vista do agente), confirmando que a query de solicitante nunca devolve tickets de outro utilizador;
- **Utilizadores**: listagem por função, confirmando que um utilizador com múltiplas funções aparece corretamente em cada filtro correspondente (join com `UserRole`, não uma comparação de igualdade).

### F. Verificação prática das restrições de negócio

- Tentar eliminar uma taxonomia (`Workflow`/`DocumentType`/`Tag`) associada a um recurso do seed e confirmar que a operação falha com um erro de restrição (`Restrict`), não com sucesso silencioso;
- Tentar remover a função `ADMIN` do único utilizador que a possui (reduzindo os `ADMIN` do seed a um, temporariamente, num teste) e confirmar que a regra aplicacional (a implementar já como função utilitária reutilizável pela futura camada de serviços) bloqueia a operação;
- Tentar criar um recurso com um `slug` já existente e confirmar a violação de unicidade;
- Tentar criar um ticket com uma `reference` já existente (cenário de teste forçado) e confirmar a violação de unicidade.

---

## Critérios de aceitação

- [ ] `prisma db seed` corre sem erros contra uma base de dados vazia;
- [ ] Executar o seed uma segunda vez não duplica nem falha (idempotência confirmada);
- [ ] O conjunto de dados cobre todos os estados editoriais, dificuldades, fluxos, tipos de documento, categorias e prioridades de ticket definidos em `project-spec.md`;
- [ ] Existe pelo menos um utilizador com múltiplas funções e dois utilizadores `ADMIN` nos dados de desenvolvimento;
- [ ] As queries de catálogo (pesquisa, filtros, paginação, ordenação) devolvem resultados corretos e usam `select`/`include` para evitar dados excessivos;
- [ ] Não existem consultas N+1 nas listagens com relações (confirmado por inspeção do número de queries geradas, ex.: com logging do Prisma em modo de desenvolvimento);
- [ ] A listagem de tickets do trabalhador nunca devolve tickets de outro utilizador;
- [ ] A listagem de utilizadores por função reflete corretamente as múltiplas funções;
- [ ] Eliminar uma taxonomia em uso falha corretamente; criar um `slug` ou `reference` duplicado falha corretamente;
- [ ] Nenhuma palavra-passe de desenvolvimento está em texto simples na base de dados (todas com hash real);
- [ ] Nenhum dado de seed usa nomes, e-mails ou conteúdos reais da DGADR;
- [ ] Testes de integração desta fase passam de forma consistente (sem instabilidade).

---

## Comandos de validação

```text
prisma db seed
prisma db seed        (segunda execução, para confirmar idempotência)
test:integration
```

Adaptar os nomes aos scripts reais do projeto.

---

## Riscos e decisões em aberto

- Confirmar o mecanismo de geração da parte aleatória da referência do ticket já nesta fase (ex.: `nanoid` ou equivalente), para ser reutilizado tal e qual pela futura camada de serviços, evitando duas implementações divergentes;
- A regra do "último `ADMIN`" ainda não tem, nesta fase, uma camada de serviço formal onde viver — nesta fase, é validada através de uma função utilitária simples e testada isoladamente, a ser promovida a serviço real na via de integração de funcionalidades, sem reescrever a lógica já validada;
- Confirmar se os testes de integração desta fase correm contra uma base de dados Docker efémera (recomendado, para isolamento) ou contra a base de dados de desenvolvimento partilhada — a primeira opção é preferível, conforme `coding-standards.md`.

---

## Dependência para a fase seguinte

A **Fase 3 (Deployment) — Containerização para Produção** assume como ponto de partida:

- o schema e as migrações estáveis (Fases 1 e 2 desta via);
- a confirmação de que a base de dados, com seeds de desenvolvimento, suporta corretamente os padrões de acesso previstos — o que dá confiança para produzir imagens de produção sem surpresas estruturais na primeira execução em ambiente containerizado.

---

> Fase 2 (BD) — só depois de os dados reais (mesmo que de desenvolvimento) resistirem a estas queries e restrições é que vale a pena avançar para empacotar a aplicação.
