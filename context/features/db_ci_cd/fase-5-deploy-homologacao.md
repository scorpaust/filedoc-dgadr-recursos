# Fase 5 (Deployment) — Ambiente de Destino Inicial (Homologação)

Esta especificação define a **quinta e última fase da via de Base de Dados e Deployment Inicial** do **Filedoc Recursos Formativos**.

Assume como ponto de partida a Fase 4 (Deployment) — Pipeline de CI/CD, já concluída: imagens de produção publicadas de forma fiável e rastreável, com gate de qualidade obrigatório.

Coerente com `project-spec.md` (secções "Infraestrutura", "Segurança", "Privacidade e RGPD" e "Variáveis de ambiente"), `coding-standards.md` e `ai-interaction.md`.

> Esta fase não inventa fornecedor, domínio institucional, ou infraestrutura concreta da DGADR não confirmada. Onde uma decisão depender de informação institucional ainda não disponível, a tarefa fica assinalada como "a confirmar", nunca preenchida com um pressuposto.

---

## Objetivo

No final desta fase, deve existir um **ambiente de homologação** (não de produção) onde:

- a imagem de produção da API (Fase 3/4) corre ligada a um PostgreSQL gerido nesse ambiente, com as migrações aplicadas de forma explícita e controlada (`prisma migrate deploy`, nunca automática e silenciosa);
- a imagem de produção da Web corre e comunica corretamente com essa API;
- existe um serviço de armazenamento de objetos (MinIO autoalojado ou um serviço compatível com S3) configurado com *buckets* privados por defeito;
- todos os segredos (credenciais de base de dados, de armazenamento, `SESSION_SECRET`) estão fora do repositório, geridos pelo mecanismo de segredos desse ambiente;
- os *health checks* (`/health`, `/ready`) são monitorizados por esse ambiente;
- existe um procedimento documentado de *deploy* e de *rollback*;
- **não existe nenhum dado real de trabalhadores da DGADR** neste ambiente — apenas dados de demonstração equivalentes aos da Fase 2 (via de BD), claramente identificados como tal.

Esta fase fecha a via de Base de Dados e Deployment Inicial. A partir daqui, o trabalho segue para a via de integração de funcionalidades (substituição controlada, fase a fase, de cada serviço mock da via de UI pelo consumo real da API), que passa a poder ser testada continuamente contra este ambiente de homologação.

---

## Âmbito

### Incluído

- Provisionamento de PostgreSQL e de armazenamento de objetos (MinIO ou compatível com S3) no ambiente de homologação escolhido;
- Configuração de segredos fora do repositório (mecanismo do próprio ambiente/plataforma de alojamento, a confirmar consoante a escolha institucional);
- Execução controlada de `prisma migrate deploy` como passo explícito do processo de *deploy*, nunca automático no arranque do contentor (decisão já tomada na Fase 3);
- Execução do seed de dados de demonstração (Fase 2, via de BD) neste ambiente — nunca dados reais;
- Monitorização básica dos *health checks*;
- Documentação do procedimento de *deploy* e de *rollback*;
- Testes de fumo (*smoke tests*) pós-*deploy*: um conjunto mínimo de verificações manuais ou automatizadas que confirmam que o ambiente está operacional depois de cada *deploy*.

### Fora de âmbito

- Produção real — esta fase entrega **homologação**; a promoção para produção exige uma decisão institucional explícita, fora do âmbito desta especificação;
- Domínio institucional, certificados, DNS — dependem de decisão e recursos da DGADR, não inventados aqui;
- Integração OIDC/SSO institucional (fora do MVP, conforme `project-spec.md`, secção M);
- Observabilidade avançada (métricas agregadas, alerting sofisticado) — a monitorização desta fase é deliberadamente mínima (health checks), coerente com o âmbito do MVP;
- Qualquer dado real de trabalhadores da DGADR, em qualquer circunstância.

---

## Entregáveis

1. Ambiente de homologação operacional, com API, Web, PostgreSQL e armazenamento de objetos a comunicar corretamente entre si;
2. Segredos geridos fora do repositório, documentados (nomes das variáveis, nunca os valores) em `.env.example`;
3. Procedimento de *deploy* documentado, incluindo a aplicação de migrações;
4. Procedimento de *rollback* documentado e, idealmente, testado pelo menos uma vez;
5. Conjunto de testes de fumo pós-*deploy*.

---

## Tarefas

### A. Provisionamento

- Confirmar, junto da DGADR ou de quem gere a infraestrutura, onde este ambiente de homologação vai correr (a decisão concreta de fornecedor/plataforma não é assumida por esta especificação);
- Provisionar uma instância de PostgreSQL para este ambiente, com *backups* automáticos ativados desde o início (mesmo em homologação, para permitir testar o próprio processo de *backup*/restauro antes de produção);
- Provisionar um serviço de armazenamento de objetos compatível com S3 (MinIO autoalojado ou serviço gerido), com *buckets* privados por defeito, coerente com `project-spec.md`.

### B. Segredos e variáveis de ambiente

- Configurar todas as variáveis de `.env.example` no mecanismo de segredos do ambiente escolhido: `DATABASE_URL`, `SESSION_SECRET`, `STORAGE_*`, `CORS_ALLOWED_ORIGINS`, etc.;
- Gerar segredos fortes e exclusivos deste ambiente — nunca reutilizar segredos de desenvolvimento local;
- Confirmar que a aplicação (API) recusa arrancar se alguma variável obrigatória estiver em falta, tal como validado desde a fundação da API;
- Documentar, sem expor valores, a lista de segredos que este ambiente requer, para facilitar a futura configuração de um ambiente de produção equivalente.

### C. Migrações em homologação

- Processo de *deploy* inclui, como passo explícito e visível (nunca escondido num *entrypoint* de contentor): `prisma migrate deploy` contra a base de dados de homologação;
- Antes de qualquer migração potencialmente destrutiva chegar a este ambiente, confirmar que passou pelo processo de revisão e autorização definido em `ai-interaction.md` — homologação não é um ambiente descartável para "testar e ver o que acontece" com alterações estruturais;
- Documentar o comando exato e a ordem dos passos do *deploy* (migrações antes de trocar o tráfego para a nova versão da API).

### D. Seed de demonstração

- Correr, neste ambiente, o mesmo seed idempotente da Fase 2 (via de BD) — nunca dados reais de trabalhadores da DGADR, processos, ou documentos institucionais;
- Confirmar que os utilizadores de demonstração usam credenciais exclusivas deste ambiente, nunca reutilizadas de desenvolvimento local.

### E. Monitorização mínima

- Configurar o ambiente para chamar `/health` e `/ready` periodicamente (mecanismo nativo da plataforma escolhida, ou um serviço externo simples);
- Definir o que acontece quando um *health check* falha (reinício automático do serviço, alerta — consoante o que a plataforma escolhida suportar nesta fase inicial).

### F. Procedimento de *deploy*

Documentar, passo a passo:

1. confirmar que a imagem a promover já passou pelo pipeline de CI/CD (Fase 4) com sucesso;
2. aplicar migrações pendentes (`prisma migrate deploy`) contra a base de dados de homologação;
3. atualizar os serviços (API, Web) para a nova imagem;
4. correr os testes de fumo;
5. confirmar os *health checks*;
6. só considerar o *deploy* concluído depois dos testes de fumo passarem.

### G. Procedimento de *rollback*

- Documentar como reverter para a imagem anterior em caso de falha detetada pelos testes de fumo ou pelos *health checks*;
- Documentar as implicações de reverter quando já foram aplicadas migrações não retrocompatíveis (cenário a evitar desde a origem, através de migrações aditivas sempre que possível);
- Testar o procedimento de *rollback* pelo menos uma vez nesta fase, para confirmar que funciona antes de ser necessário a sério.

### H. Testes de fumo

Conjunto mínimo, executável manualmente ou por um pequeno script, depois de cada *deploy*:

- `GET /health` e `GET /ready` respondem corretamente;
- a Web carrega e mostra a casca da aplicação;
- um login de demonstração (utilizador seed) funciona, quando a via de integração de funcionalidades já tiver ligado a autenticação real; até lá, este teste de fumo específico fica documentado como pendente de ativação, não removido.

---

## Critérios de aceitação

- [ ] API, Web, PostgreSQL e armazenamento de objetos comunicam corretamente no ambiente de homologação;
- [ ] Nenhum segredo está no repositório; todos estão geridos pelo mecanismo do ambiente;
- [ ] `prisma migrate deploy` foi executado com sucesso como passo explícito e documentado do *deploy*, nunca automático e silencioso;
- [ ] O ambiente contém apenas dados de demonstração (seed da Fase 2), nunca dados reais da DGADR;
- [ ] Os *health checks* estão a ser chamados periodicamente e o comportamento em caso de falha está definido;
- [ ] O procedimento de *deploy* está documentado e foi seguido, no mínimo, uma vez com sucesso;
- [ ] O procedimento de *rollback* está documentado e foi testado pelo menos uma vez;
- [ ] Os testes de fumo pós-*deploy* estão definidos e foram executados com sucesso.

---

## Comandos de validação

```text
prisma migrate deploy
curl <URL>/api/v1/health
curl <URL>/api/v1/ready
```

Adaptar à convenção final de URLs deste ambiente, sem inventar um domínio institucional não confirmado.

---

## Riscos e decisões em aberto

- A escolha concreta de onde este ambiente de homologação corre (fornecedor de alojamento, se autoalojado internamente pela DGADR, etc.) é uma decisão institucional que esta especificação não assume — sinalizar explicitamente esta dependência antes de iniciar a fase;
- Confirmar a política de retenção de *backups* de homologação (não precisa de ser tão rigorosa como produção, mas deve existir, mesmo que mínima);
- O teste de fumo de login fica pendente até a via de integração de funcionalidades ligar a autenticação real — não esquecer de o ativar nessa altura, em vez de o deixar esquecido como documentação desatualizada.

---

## Fecho da via de Base de Dados e Deployment Inicial

Com esta fase concluída, a via de Base de Dados e Deployment Inicial (Fases 1 a 5) está terminada: existe um modelo de dados completo e validado, seeds idempotentes, imagens de produção containerizadas, um pipeline de CI/CD com gate de qualidade obrigatório, e um ambiente de homologação operacional, sem qualquer dado real da DGADR.

Com as duas vias fundamentais concluídas — **UI** (Fases 1–11, interface completa sobre dados mock) e **Base de Dados & Deployment** (Fases 1–5, infraestrutura e persistência reais) — o trabalho segue para a **via de integração de funcionalidades**: substituir, uma funcionalidade de cada vez, cada serviço mock da via de UI pelo respetivo consumo real da API NestJS já ligada a este ambiente, seguindo o contrato registado em `docs/interfaces-mock-ui.md` e o fluxo de trabalho definido em `ai-interaction.md`.

---

> Fase 5 (Deployment) — homologação é onde se descobrem os problemas antes de custarem confiança institucional; por isso nunca leva dados reais, e nunca avança sem testes de fumo a confirmar.
