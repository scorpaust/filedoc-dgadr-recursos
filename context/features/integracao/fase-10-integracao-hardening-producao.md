# Fase 10 (Integração) — Hardening, Testes E2E Reais e Preparação para Produção

Esta é a **última fase de todo o projeto Filedoc Recursos Formativos**. Não introduz funcionalidades novas — consolida, audita e prepara para produção tudo o que foi construído nas três vias: **UI** (Fases 1–11), **Base de Dados e Deployment** (Fases 1–5) e **Integração de Funcionalidades** (Fases 1–9).

Infraestrutura confirmada: **AWS — ECS Fargate (Express Mode) + ECR + S3/European Sovereign Cloud**, decidida na Fase 5 do Deployment e usada em todas as fases desde então.

Coerente com `project-spec.md` na íntegra — em particular "Segurança", "Privacidade e RGPD", "Regras obrigatórias do projeto" e "Estado atual" — e com `coding-standards.md` e `ai-interaction.md`.

---

## Objetivo

No final desta fase:

- toda a aplicação foi auditada, ponta a ponta, contra a checklist de segurança de `project-spec.md`, com dados e infraestrutura reais (já não mocks nem apenas homologação teórica);
- a suite E2E completa (Fase 11 da via de UI) corre integralmente contra a API real, em homologação, sem qualquer mock remanescente;
- os catorze fluxos mínimos de `project-spec.md` foram validados manualmente pelo menos uma vez em condições reais, além dos testes automatizados;
- o ambiente está preparado, tecnicamente, para uma promoção a produção — ficando a decisão formal de "ir para produção" como um passo institucional explícito da DGADR, não uma consequência automática desta fase;
- `project-spec.md` é atualizado, na secção "Estado atual", para refletir o projeto concluído.

---

## Âmbito

### Incluído

- Revisão de segurança completa (checklist abaixo);
- Revisão de privacidade/RGPD;
- Execução da suite E2E completa contra a API real;
- Validação manual dos catorze fluxos mínimos;
- Preparação técnica de produção na AWS: definição de serviço ECS de produção (separado de homologação), estratégia de base de dados de produção, TLS/domínio (sinalizado como dependência institucional), alarmes básicos, política de *backup* final;
- Atualização da documentação do projeto ao estado final;
- Handoff formal: revisão do `README.md`, de `coding-standards.md` e `ai-interaction.md` para confirmar que continuam a refletir a realidade do projeto concluído.

### Fora de âmbito

- Qualquer funcionalidade nova (Segunda Fase e Evolução Futura do roadmap de `project-spec.md` — ficam para um ciclo de trabalho seguinte, fora desta especificação);
- A decisão institucional de promover para produção — esta fase deixa o projeto **pronto**, não o promove automaticamente;
- Domínio institucional, certificados TLS finais — dependem de recursos da DGADR não confirmados por esta especificação.

---

## Tarefas

### A. Revisão de segurança (checklist completa)

Confirmar, com verificação real (não apenas leitura do código), cada item de `project-spec.md`, secção "Segurança":

- validação de entrada em todos os endpoints (DTOs com `class-validator` ou equivalente, `whitelist`/`forbidNonWhitelisted` ativos);
- autenticação e autorização por função e por recurso, incluindo todos os caminhos negativos já testados fase a fase;
- proteção contra XSS (nenhum `innerHTML` com conteúdo não confiável na via de UI), CSRF (avaliar necessidade dado o uso de cookies `SameSite`), injeção (uso exclusivo do Prisma, sem SQL manual não parametrizado);
- CORS restritivo, configurado apenas para os domínios/subdomínios finais;
- *rate limiting* em todos os endpoints sensíveis (login já coberto na Fase 1; avaliar extensão a outros endpoints de escrita);
- *headers* de segurança e Content Security Policy, configurados no servidor da Web (Fase 3 do Deployment) e confirmados em produção;
- cookies seguros, confirmados na topologia final de domínio da AWS (ALB + ECS);
- segredos exclusivamente em variáveis de ambiente/gestor de segredos da AWS, nunca no código ou nas imagens;
- logs sem informação sensível, confirmado por amostragem real dos logs em homologação;
- análise de dependências (vulnerabilidades conhecidas) sem findings críticos por resolver.

### B. Revisão de privacidade e RGPD

- Confirmar minimização de dados: nenhum campo recolhido sem finalidade definida em `project-spec.md`;
- Confirmar a política de retenção configurada (`RETENTION_POLICY_DAYS`) e que existe um processo, mesmo que manual nesta fase, para a aplicar;
- Confirmar que nenhum serviço de rastreamento externo foi introduzido em nenhuma fase (auditoria ao código, não apenas à documentação);
- Documentar, em `project-overview.md` ou documento próprio: dados guardados, finalidade, utilizadores com acesso, política de retenção, tratamento de ficheiros, tratamento de logs — conforme já previsto em `project-spec.md`.

### C. Testes E2E reais e validação manual

- Suite E2E completa (Fase 11 da via de UI) a correr contra a API real em homologação, integrada no pipeline de CI/CD (Fase 4 do Deployment);
- Validação manual, por uma pessoa, dos catorze fluxos mínimos de `project-spec.md`, em condições reais (rede real, ficheiros reais de demonstração, não localhost);
- Testar explicitamente, em condições reais, o comportamento de `Range` no *streaming* de vídeo servido pelo S3/European Sovereign Cloud (confirmar que o avançar/recuar funciona tal como validado tecnicamente na Fase 2 desta via).

### D. Preparação técnica para produção (AWS)

- Definir um serviço ECS de produção distinto do de homologação (imagens promovidas do mesmo ECR, nunca reconstruídas especificamente para produção — a mesma imagem testada é a que é promovida, conforme a estratégia de configuração da Web decidida na Fase 3 do Deployment);
- Confirmar a estratégia de base de dados de produção (recomendação: Amazon RDS para PostgreSQL, pela gestão automática de *backups*, *patching* e alta disponibilidade — a confirmar institucionalmente, tal como qualquer outra escolha de infraestrutura concreta);
- Sinalizar como dependência institucional, não resolvida por esta especificação: domínio final, certificado TLS (ex.: AWS Certificate Manager, se aplicável), e a decisão formal de quando promover;
- Alarmes básicos (ex.: Amazon CloudWatch) sobre os *health checks* e sobre erros 5xx elevados;
- Confirmar a política de *backup* final de produção, tanto da base de dados como do armazenamento de objetos (distintas, conforme já definido na Fase 5 do Deployment), com um teste de restauro documentado.

### E. Atualização da documentação final

- Atualizar `project-spec.md`, secção "Estado atual", de "pronto para implementação" para o estado real e definitivo do projeto;
- Confirmar que `README.md` reflete o processo de arranque local, de build e de *deploy* tal como existem no final do projeto, não como estavam previstos no início;
- Confirmar que `ai-interaction.md` e `coding-standards.md` continuam válidos para qualquer manutenção futura (Segunda Fase, Evolução Futura) — corrigir qualquer divergência acumulada ao longo das fases.

---

## Critérios de aceitação

- [ ] Checklist de segurança de `project-spec.md` confirmada item a item, com evidência (não apenas "parece estar bem");
- [ ] Checklist de privacidade/RGPD confirmada, com documentação de dados/finalidade/retenção publicada;
- [ ] Suite E2E completa passa contra a API real, integrada no pipeline de CI/CD;
- [ ] Os catorze fluxos mínimos foram validados manualmente em condições reais, incluindo o *streaming* de vídeo com `Range` via S3;
- [ ] Ambiente de produção tecnicamente preparado (serviço ECS distinto, base de dados de produção definida, alarmes ativos, *backup* testado), com as dependências institucionais (domínio, TLS, decisão de promoção) explicitamente sinalizadas como pendentes, não assumidas;
- [ ] `project-spec.md`, `README.md`, `ai-interaction.md` e `coding-standards.md` atualizados ao estado final do projeto;
- [ ] Nenhum dado real da DGADR em nenhum ambiente que não seja o de produção formalmente aprovado.

---

## Comandos de validação

```text
lint
format:check
typecheck
test
test:integration
test:e2e
npm audit
```

---

## Riscos e decisões em aberto

- A promoção para produção depende de decisões institucionais (domínio, certificado, aprovação formal) fora do controlo técnico desta especificação — esta fase entrega um sistema **pronto para produção**, não **em produção**;
- Confirmar, antes do fecho definitivo, se a DGADR decidiu usar Amazon RDS para PostgreSQL ou uma instância autoalojada em ECS/EC2 — a recomendação técnica é RDS, mas a decisão final cabe à DGADR;
- Rever esta checklist sempre que a Segunda Fase ou a Evolução Futura de `project-spec.md` forem iniciadas — esta especificação cobre o MVP, não as fases seguintes do produto.

---

## Fecho do projeto

Com esta fase concluída, o **Filedoc Recursos Formativos** está tecnicamente completo enquanto MVP: três vias de trabalho — UI, Base de Dados & Deployment, e Integração de Funcionalidades — totalizando 26 fases especificadas e implementadas, desde a casca visual mais simples até a autenticação, o armazenamento, cada área funcional, e a auditoria de segurança final, tudo alinhado desde o início com `project-spec.md` e sem nunca comprometer os princípios definidos em `coding-standards.md` e `ai-interaction.md`: nada de pagamentos, nada de registo público, nenhum ficheiro binário na base de dados, nenhuma permissão confiada só ao frontend, nenhuma integração institucional inventada.

O que resta é institucional, não técnico: a DGADR decidir domínio, certificado, e o momento de promoção formal a produção.

---

> Fase 10 (Integração) — o fim de uma especificação não é o fim do produto; é o ponto em que o produto deixa de depender de mais especificação para poder continuar a existir.
