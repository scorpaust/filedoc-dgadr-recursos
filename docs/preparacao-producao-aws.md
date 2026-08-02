# Preparação técnica para produção — AWS

Documento da Fase 10 (Integração, Hardening), tarefa D: **prepara**, não
promove, um ambiente de produção. Nenhum recurso AWS foi provisionado por
esta fase — ver "Porquê um documento, não Terraform/IaC" abaixo.

## Estado real da infraestrutura, confirmado nesta fase

Ao contrário do que a especificação desta fase (linha 5) descreve como
"infraestrutura confirmada", a investigação feita no arranque da Fase 10
confirmou que **nenhuma infraestrutura AWS foi provisionada em nenhuma fase
anterior**: `context/features/db_ci_cd/fase-5-deploy-homologacao.md` regista
explicitamente que a direção AWS (ECS Fargate + ECR + S3/European Sovereign
Cloud) era, à data, "uma assunção de trabalho, ainda sem confirmação
institucional pela DGADR", e que por isso a homologação foi implementada
como uma simulação Docker Compose autoalojada (`docker-compose.homolog.yml`,
`docs/deploy-homologacao.md`) — nunca como uma stack AWS real. `README.md`
confirma o mesmo. Este documento assume esse estado real, não o texto da
especificação.

## Porquê um documento, não Terraform/IaC

Sem conta AWS nem credenciais disponíveis nesta fase, e sem uma decisão
institucional confirmada sobre se a DGADR vai mesmo usar AWS (ou uma
alternativa), escrever ficheiros Terraform/CDK nunca testados nem aplicados
arriscaria transmitir uma falsa sensação de infraestrutura "pronta a
aplicar" — o oposto do objetivo desta fase ("ambiente tecnicamente
preparado, não promovido automaticamente"). Este documento cobre a mesma
decisão técnica com o mesmo nível de detalhe que um `.tf` teria, no mesmo
formato narrativo já usado por `docs/deploy-homologacao.md`/
`docs/rollback-homologacao.md` para a homologação — decisão tomada com o
utilizador no arranque desta fase.

## Serviço ECS de produção

- Um serviço ECS Fargate **distinto** do de homologação (caso a homologação
  venha a migrar para AWS no futuro) — nunca partilhado, para que um
  problema de capacidade/configuração em homologação nunca afete produção.
- A imagem promovida para produção é **sempre a mesma imagem já publicada em
  `ghcr.io`** pelo `publish-images.yml` e já validada em homologação —
  nunca reconstruída especificamente para produção. Esta é a mesma decisão
  já tomada na Fase 3 (Deployment) para a configuração runtime da Web
  (`env.js`/`generate-env-config.sh`) e estendida nesta fase à configuração
  do CSP (`generate-security-headers.sh`) — a imagem nunca hardcoda um
  domínio, é sempre configurada em tempo de arranque do contentor.
- Runbook de promoção (paralelo aos passos 1-3 de
  `docs/deploy-homologacao.md`, adaptado a ECS em vez de Compose):
  1. confirmar a tag exata já validada em homologação (`IMAGE_TAG` de
     `.env.homolog`, o mesmo *commit* que passou por `verify.yml`);
  2. `prisma migrate deploy` contra a base de dados de produção, sempre
     antes de trocar o tráfego (mesma regra da Fase 3/5 — nunca automático
     no arranque do contentor);
  3. atualizar a definição de tarefa (*task definition*) do serviço ECS de
     produção para essa tag, com um `ECR`/registo acessível — se as imagens
     continuarem em `ghcr.io` (não `ECR`, como a especificação original
     assumia), confirmar que o serviço ECS consegue autenticar-se a um
     registo externo, ou promover a imagem para ECR nesse momento;
  4. `deployment circuit breaker` do ECS ativado, para reverter
     automaticamente para a *task definition* anterior se os novos
     *health checks* falharem — equivalente automatizado do
     `docs/rollback-homologacao.md` manual.

## Base de dados de produção

**Recomendação**: Amazon RDS para PostgreSQL — gestão automática de
*backups*, *patching* de segurança e alta disponibilidade (Multi-AZ),
sem exigir operação manual de um PostgreSQL autoalojado em ECS/EC2.

**Alternativa em aberto**: PostgreSQL autoalojado em ECS/EC2 (mesma imagem
`postgres:16-alpine` já usada em todos os ambientes desta aplicação),
caso a DGADR prefira não usar RDS por custo, política de dados ou outra
razão institucional.

Esta escolha **não está confirmada** — cabe à DGADR. Qualquer que seja a
opção, migrações continuam a correr por `prisma migrate deploy`, nunca por
`prisma db push` (regra obrigatória do projeto, válida em qualquer ambiente
partilhado).

## Alarmes (Amazon CloudWatch)

Propostos, com limiares concretos para servirem de ponto de partida —
ajustáveis com dados reais de utilização, indisponíveis antes de existir um
ambiente real:

| Alarme | Métrica | Limiar sugerido | Ação |
|---|---|---|---|
| API indisponível | Falhas consecutivas do `HEALTHCHECK`/ *target group* health check (`GET /api/v1/health`) | ≥ 3 falhas consecutivas | Notificação (ex. SNS → e-mail/Slack institucional) |
| Taxa de erros 5xx elevada | `HTTPCode_Target_5XX_Count` (ALB) / total de pedidos | > 5% em 5 minutos | Notificação |
| Base de dados inacessível | Falhas de `GET /api/v1/ready` (readiness, confirma ligação à BD — ver `apps/api/src/health/health.controller.ts`) | ≥ 3 falhas consecutivas | Notificação |
| Utilização de CPU/memória da tarefa ECS | `CPUUtilization`/`MemoryUtilization` | > 85% sustentado 10 minutos | Notificação (sinal para rever dimensionamento) |

Sem uma plataforma de alojamento institucional confirmada (ver
`docs/deploy-homologacao.md`, secção "Monitorização"), nenhum destes
alarmes foi criado — ficam como especificação a aplicar quando existir uma
conta AWS real.

## Política de backup

- **Base de dados**: se RDS, *automated backups* nativos (retenção
  configurável, recomendação inicial de 7 dias, a confirmar com a DGADR) +
  um *snapshot* manual antes de cada promoção para produção, pela mesma
  razão dos backups manuais já feitos em homologação
  (`scripts/homolog/backup-postgres.sh`) antes de um *deploy* de risco. Se
  autoalojado, adaptar `scripts/homolog/backup-postgres.sh`/
  `restore-postgres.sh` (já testados em homologação) ao novo anfitrião.
- **Armazenamento de objetos**: *versioning* do bucket S3/European
  Sovereign Cloud ativado (distinto da retenção do PostgreSQL, conforme já
  decidido na Fase 5 — Deployment) — protege contra remoção acidental de um
  ficheiro de recurso publicado, sem depender de um backup separado.
- **Teste de restauro documentado** (procedimento, não execução real — sem
  conta AWS disponível nesta fase):
  1. restaurar o *snapshot*/backup mais recente para uma instância RDS (ou
     base de dados autoalojada) **isolada**, nunca sobre a instância de
     produção;
  2. apontar uma cópia da API (mesma imagem, `DATABASE_URL` alterado) para
     essa instância restaurada;
  3. confirmar, com o mesmo `scripts/homolog/smoke-test.sh` já usado em
     homologação, que os fluxos mínimos respondem corretamente contra os
     dados restaurados;
  4. documentar a duração do restauro (RTO real, não estimado) e destruir a
     instância isolada no final do teste.

## Dependências institucionais pendentes

Nada do que se segue foi assumido nem decidido por esta fase:

- **Domínio final de produção** — sem ele, `CORS_ALLOWED_ORIGINS`
  (API) e `API_URL`/`STORAGE_PUBLIC_ORIGIN` (Web) continuam com os valores
  de desenvolvimento/homologação local.
- **Certificado TLS** (ex. AWS Certificate Manager, se a escolha final for
  um ALB) — sem TLS real, `TRUST_PROXY`/`Secure` dos cookies e
  `Strict-Transport-Security` (já emitido pela Web desde esta fase, inócuo
  sobre HTTP simples) só podem ser confirmados em condições reais.
- **Confirmação de AWS como plataforma final** — ou de uma alternativa
  institucional distinta, incluindo se a homologação real chega alguma vez
  a sair da simulação Docker Compose atual.
- **Escolha final entre RDS e PostgreSQL autoalojado**.
- **Decisão formal de promoção para produção** — esta fase deixa o sistema
  tecnicamente pronto; a decisão de o promover é institucional, não técnica.

Até estas dependências ficarem resolvidas, `docker-compose.homolog.yml`
continua a ser o ambiente de referência mais próximo de produção
efetivamente validado por esta aplicação.
