# Guia de Deployment no Portal AWS — Filedoc Recursos Formativos

Guia prático, passo a passo, para colocar o Filedoc Recursos Formativos a correr na AWS, seguindo a arquitetura já decidida nas especificações do projeto: **Amazon ECS com Fargate (Express Mode)** para computação, **Amazon ECR** para as imagens Docker, **Amazon S3** (região UE ou European Sovereign Cloud) para ficheiros, e **Amazon RDS** para PostgreSQL.

Este guia é o companheiro operacional de `fase-5-deploy-homologacao.md` (via de Deployment) e `fase-10-integracao-hardening-producao.md` (via de Integração) — não repete as decisões já tomadas nesses documentos, aplica-as na consola.

> Datas e nomes de serviço confirmados em julho de 2026. O AWS App Runner está em modo de manutenção (sem novos clientes desde abril de 2026) — por isso este guia usa ECS Express Mode, o caminho atualmente recomendado pela própria AWS para implantações simples de contentores.

---

## Índice

0. Pré-requisitos
1. Conta, organização e permissões (IAM)
2. Rede — usar a VPC predefinida ou criar uma dedicada
3. Base de dados — Amazon RDS (PostgreSQL)
4. Armazenamento — Amazon S3
5. Segredos — AWS Secrets Manager
6. Publicar as imagens — Amazon ECR
7. Computação — Amazon ECS Express Mode
8. Ligar API e Web uma à outra
9. Migrações da base de dados
10. CI/CD automatizado (GitHub Actions)
11. Domínio, certificado e HTTPS institucional
12. Observabilidade — CloudWatch
13. Backups e recuperação
14. Segurança adicional (WAF, rotação de segredos)
15. Separar Homologação de Produção
16. Checklist final de arranque
17. Estimativa de custos (ordem de grandeza)

---

## 0. Pré-requisitos

- Conta AWS ativa (idealmente gerida via **AWS Organizations**, se a DGADR já tiver uma estrutura multi-conta — uma conta separada para este projeto, ou pelo menos para homologação vs. produção, é a prática recomendada);
- Region alvo já decidida: uma região UE "normal" (`eu-west-1`/Irlanda, `eu-central-1`/Frankfurt, `eu-west-3`/Paris) ou a **AWS European Sovereign Cloud**, consoante o requisito de soberania confirmado pela DGADR (ver `fase-5-deploy-homologacao.md`);
- AWS CLI instalado localmente (`aws --version`) e autenticado (`aws configure` ou `aws configure sso`);
- Docker instalado localmente, com as imagens de produção da API e da Web já a construir com sucesso (`fase-3-deploy-containerizacao.md`);
- Acesso ao repositório Git do projeto, para o passo de CI/CD.

---

## 1. Conta, organização e permissões (IAM)

1. **Nunca usar a conta root para trabalho do dia a dia.** Abrir **IAM → Users** (ou **IAM Identity Center**, se a DGADR tiver SSO institucional) e criar um utilizador/grupo dedicado a este projeto;
2. Para o setup inicial, atribuir a política gerida `AdministratorAccess` a esse utilizador — depois de tudo criado, apertar para permissões mínimas específicas (ECS, ECR, RDS, S3, Secrets Manager, CloudWatch, IAM apenas para as *roles* deste projeto);
3. Ativar **MFA** na conta root e em qualquer utilizador com permissões elevadas;
4. Se a DGADR tiver política de etiquetagem de recursos (*tagging*), definir desde já uma convenção (ex.: `project=filedoc`, `environment=homologacao`) — vai facilitar a separação de custos e a Secção 15 deste guia.

---

## 2. Rede — VPC

Duas opções, em ordem de simplicidade:

**Opção A — usar a VPC predefinida (mais simples, adequada para homologação):**
- A conta AWS já vem com uma VPC predefinida com subnets públicas em várias zonas de disponibilidade — o Express Mode usa-a automaticamente se não especificares nada;
- Confirmar, em **VPC → Your VPCs**, que existe uma VPC `default` com pelo menos duas subnets públicas em duas zonas de disponibilidade diferentes, cada uma com pelo menos 8 IPs livres (requisito mínimo do Express Mode).

**Opção B — criar uma VPC dedicada (recomendado para produção):**
- **VPC → Create VPC → VPC and more** (o assistente cria automaticamente subnets públicas e privadas, *route tables* e um *internet gateway*);
- Definir subnets **privadas** para a base de dados (RDS nunca deve ser publicamente acessível) e subnets **públicas** para o *load balancer* que o Express Mode cria;
- Neste caso, ao criar o serviço Express Mode (Secção 7), especifica-se explicitamente estas subnets em "Additional configurations".

Este guia assume a **Opção A** para homologação (mais rápida) e recomenda a **Opção B** antes de promover para produção (Secção 15).

---

## 3. Base de dados — Amazon RDS (PostgreSQL)

1. Consola **RDS → Create database**;
2. **Choose a database creation method**: Standard create;
3. **Engine options**: PostgreSQL, escolher a versão alinhada com a usada em desenvolvimento;
4. **Templates**: "Dev/Test" para homologação, "Production" quando promoveres (ativa Multi-AZ e outras proteções por defeito);
5. **Settings**: definir o identificador (ex.: `filedoc-homologacao`) e a *master password* — não a escrevas em nenhum ficheiro; vai diretamente para o Secrets Manager (Secção 5);
6. **Instance configuration**: uma instância pequena chega para homologação (ex.: `db.t4g.micro` ou `db.t4g.small`); rever para produção consoante o volume real de utilizadores;
7. **Connectivity**:
   - **Virtual private cloud (VPC)**: a mesma VPC onde o ECS vai correr (Secção 2);
   - **Public access: No** — nunca deixar a base de dados publicamente acessível;
   - **VPC security group**: criar um novo, ex. `filedoc-rds-sg` — vai ser referenciado no passo 11;
8. **Additional configuration**:
   - Nome da base de dados inicial (ex.: `filedoc`);
   - **Backup**: ativar, retenção mínima de 7 dias (ver Secção 13 para a política final);
   - **Encryption**: ativar *encryption at rest*;
9. **Create database** — demora alguns minutos;
10. Depois de criada, abrir a instância e anotar o **Endpoint** e a **Port** (normalmente `5432`) — vão compor o `DATABASE_URL`;
11. **Ligar o ECS ao RDS**: no *security group* `filedoc-rds-sg` criado no passo 7, adicionar uma regra de entrada (*inbound rule*) que permite tráfego na porta `5432` a partir do *security group* que o Express Mode vai criar para as tarefas da API (esse *security group* só fica visível depois da Secção 7 — voltar aqui para completar esta ligação depois de criares o serviço da API).

```text
DATABASE_URL=postgresql://<utilizador>:<password>@<endpoint-rds>:5432/filedoc?schema=public
```

---

## 4. Armazenamento — Amazon S3

1. Consola **S3 → Create bucket**;
2. **Bucket name**: globalmente único (ex.: `filedoc-recursos-homologacao-<sufixo>`);
3. **AWS Region**: a mesma decidida na Secção 0 (UE ou European Sovereign Cloud);
4. **Object Ownership**: "ACLs disabled" (recomendado);
5. **Block Public Access settings**: manter **todas as opções ativas** (bucket totalmente privado) — o acesso é sempre via URLs pré-assinados gerados pela API (`fase-2-integracao-armazenamento.md`), nunca diretamente;
6. **Bucket Versioning**: ativar — protege contra substituições acidentais de ficheiros;
7. **Default encryption**: ativar (SSE-S3 é suficiente nesta fase; SSE-KMS se a DGADR exigir chaves geridas por si);
8. **Create bucket**;
9. **Configurar CORS** (necessário para o browser conseguir fazer upload diretamente via URL pré-assinado): no bucket criado, separador **Permissions → Cross-origin resource sharing (CORS)**, colar:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": ["https://<url-da-web-app>"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

   — substituir `AllowedOrigins` pelo URL real da Web assim que existir (Secção 7); sem isto, os uploads diretos do browser para o S3 falham por bloqueio de CORS;

10. **Lifecycle rules** (opcional nesta fase, recomendado antes de produção): regra para expirar *multipart uploads* incompletos ao fim de, por exemplo, 7 dias (**Management → Create lifecycle rule** → "Delete expired object delete markers or incomplete multipart uploads");
11. **Permissões de acesso**: em vez de gerar chaves de acesso fixas (`STORAGE_ACCESS_KEY`/`STORAGE_SECRET_KEY`), a opção mais segura é atribuir à *IAM Task Role* da API (Secção 7) uma política que permite `s3:PutObject`, `s3:GetObject`, `s3:DeleteObject` apenas neste bucket — evita ter credenciais fixas para gerir e rodar.

---

## 5. Segredos — AWS Secrets Manager

1. Consola **Secrets Manager → Store a new secret**;
2. **Secret type**: "Other type of secret";
3. Adicionar como pares chave-valor: `DATABASE_URL`, `SESSION_SECRET` (gerar um valor aleatório forte, ex. `openssl rand -base64 32`), e quaisquer outras variáveis sensíveis de `.env.example`;
4. **Secret name**: ex. `filedoc/homologacao/api`;
5. **Encryption key**: a chave gerida pela AWS por defeito é suficiente nesta fase;
6. Rever o passo de rotação automática (Secção 14) antes de produção;
7. Anotar o ARN do segredo — vai ser referenciado diretamente na definição da tarefa ECS (Secção 7), nunca copiado para variáveis de ambiente em texto simples.

---

## 6. Publicar as imagens — Amazon ECR

Repetir para a API e para a Web:

1. Consola **ECR → Create repository** (ex.: `filedoc-api`, `filedoc-web`); **Tag immutability: Enabled** (impede substituir uma tag já publicada, reforça a rastreabilidade já exigida em `fase-4-deploy-cicd.md`); **Scan on push: Enabled** (deteção automática de vulnerabilidades);
2. Autenticar o Docker local ao ECR:

```bash
aws ecr get-login-password --region eu-west-1 \
  | docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-west-1.amazonaws.com
```

3. Build, tag e push:

```bash
docker build -t filedoc-api -f apps/api/Dockerfile .
docker tag filedoc-api:latest <account-id>.dkr.ecr.eu-west-1.amazonaws.com/filedoc-api:<commit-sha>
docker push <account-id>.dkr.ecr.eu-west-1.amazonaws.com/filedoc-api:<commit-sha>
```

4. Repetir para `filedoc-web`;
5. Confirmar em **ECR → Repositories → filedoc-api → Images** que a imagem apareceu, com a *tag* correta — nunca publicar só com `latest`.

---

## 7. Computação — Amazon ECS Express Mode

Repetir este bloco completo duas vezes — uma para a API, outra para a Web.

1. Consola **ECS → Express mode** (menu lateral);
2. **Image URI**: "Browse ECR images" → escolher o repositório (`filedoc-api` ou `filedoc-web`) → escolher a imagem/tag publicada na Secção 6;
3. **Service name**: ex. `filedoc-api-homologacao`;
4. **Container port**: a porta que a aplicação escuta dentro do contentor — API tipicamente `3000`, Web (Nginx) tipicamente `80`;
5. **Health check path**: `/api/v1/health` para a API; `/` para a Web;
6. **Environment variables**: adicionar as não sensíveis diretamente (`NODE_ENV=production`, `CORS_ALLOWED_ORIGINS`, `STORAGE_BUCKET`, `STORAGE_REGION`, etc. — ver lista completa de `project-spec.md`); para as sensíveis (Secção 5), usar a opção de referenciar o segredo do Secrets Manager em vez de as escrever aqui;
7. **Task execution role / Infrastructure role**: na primeira utilização, o Express Mode oferece-se para criar estas *roles* automaticamente — aceitar; para a API, depois de criada a *role* de tarefa (*Task Role*, distinta da *Task Execution Role*), voltar ao IAM e anexar-lhe a política de acesso ao bucket S3 (Secção 4, passo 11) e permissão para ler o segredo do Secrets Manager (Secção 5);
8. Abrir **Additional configurations — optional**:
   - **Cluster**: usar o cluster `default`, ou criar um dedicado (`filedoc-homologacao`) para manter isolamento de outros projetos na mesma conta;
   - **Subnets**: deixar em branco para usar as subnets públicas da VPC predefinida (Secção 2, Opção A), ou especificar as subnets da VPC dedicada (Opção B);
   - **Desired count** / **Auto-scaling**: 1 tarefa é suficiente para homologação; definir min/max (ex. 1–3) com base em CPU antes de produção;
9. **Create** — o Express Mode cria automaticamente: *Application Load Balancer*, HTTPS com certificado gerido, *security groups*, *auto-scaling*, CloudWatch Logs e Container Insights. Em poucos minutos, o separador **Resources** mostra o progresso e, no fim, um **Application URL** público em HTTPS, já pronto a usar;
10. **Ligar ao RDS**: voltar ao *security group* `filedoc-rds-sg` (Secção 3, passo 11) e adicionar a regra de entrada na porta `5432`, com origem no *security group* que o Express Mode acabou de criar para as tarefas da API (visível em **EC2 → Security Groups**, filtrando por nome do serviço).

---

## 8. Ligar API e Web uma à outra

1. Depois de ambos os serviços Express Mode estarem criados, cada um tem o seu **Application URL** próprio (visível em **ECS → Express mode → [serviço] → Details**);
2. Atualizar a variável de ambiente `API_URL` do serviço Web para apontar para o URL da API (conforme a estratégia de configuração no arranque do contentor já decidida em `fase-3-deploy-containerizacao.md` — não deve exigir reconstruir a imagem);
3. Atualizar `CORS_ALLOWED_ORIGINS` na API para incluir o URL da Web;
4. Atualizar a política de **CORS do bucket S3** (Secção 4, passo 9) com o URL real da Web, substituindo o valor provisório;
5. Voltar a cada serviço Express Mode e aplicar estas alterações de variável de ambiente (a consola permite editar e reimplantar sem reconstruir a imagem).

---

## 9. Migrações da base de dados

Nunca automático no arranque do contentor (decisão já tomada em `fase-3-deploy-containerizacao.md`). Três formas de correr `prisma migrate deploy` de forma controlada:

**Opção A — tarefa ECS pontual (recomendado):**
```bash
aws ecs run-task \
  --cluster filedoc-homologacao \
  --task-definition filedoc-api-migrate \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[<subnet-id>],securityGroups=[<sg-id>],assignPublicIp=ENABLED}" \
  --overrides '{"containerOverrides":[{"name":"api","command":["npx","prisma","migrate","deploy"]}]}'
```

**Opção B — passo explícito no pipeline de CI/CD** (Secção 10), correndo antes de atualizar o serviço ECS;

**Opção C — túnel/bastion** para uma máquina com acesso à VPC, correndo o comando localmente contra o `DATABASE_URL` de homologação — mais manual, aceitável só para a primeira migração inicial.

---

## 10. CI/CD automatizado (GitHub Actions)

A própria AWS publicou um guia dedicado a isto — build → push para ECR → atualizar o serviço Express Mode automaticamente a cada `push`. Esboço do workflow (adaptar aos scripts reais do projeto e a `fase-4-deploy-cicd.md`):

```yaml
name: Deploy to ECS Express Mode

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<account-id>:role/github-actions-deploy
          aws-region: eu-west-1

      - name: Login to ECR
        run: aws ecr get-login-password | docker login --username AWS --password-stdin <account-id>.dkr.ecr.eu-west-1.amazonaws.com

      - name: Build and push API image
        run: |
          docker build -t filedoc-api -f apps/api/Dockerfile .
          docker tag filedoc-api:latest <account-id>.dkr.ecr.eu-west-1.amazonaws.com/filedoc-api:${{ github.sha }}
          docker push <account-id>.dkr.ecr.eu-west-1.amazonaws.com/filedoc-api:${{ github.sha }}

      - name: Run database migrations
        run: aws ecs run-task --cluster filedoc-homologacao --task-definition filedoc-api-migrate ...

      - name: Update ECS Express Mode service
        run: aws ecs update-service --cluster filedoc-homologacao --service filedoc-api-homologacao --force-new-deployment
```

- Usar **OIDC entre GitHub Actions e IAM** (`role-to-assume`), nunca chaves de acesso fixas coladas nos *secrets* do GitHub — mais seguro e alinhado com a Secção 1;
- Este workflow só corre a partir de `main`, nunca a partir de *pull requests* de origem externa, conforme já definido em `fase-4-deploy-cicd.md`.

---

## 11. Domínio, certificado e HTTPS institucional

- O Express Mode já dá HTTPS num URL AWS por defeito (ex. `filedoc-api-homologacao.xxxxx.eu-west-1.elb.amazonaws.com`) — **suficiente para homologação**, sem passos adicionais;
- Um domínio institucional (ex. `filedoc.dgadr.gov.pt`) exige:
  1. **AWS Certificate Manager (ACM)**: pedir um certificado público para o domínio pretendido (validação por DNS, mais rápida, ou por e-mail);
  2. **Route 53** (ou o DNS que a DGADR já usa, se não for gerido na AWS): criar um registo `CNAME`/`ALIAS` a apontar para o *Application Load Balancer* criado pelo Express Mode;
  3. No serviço Express Mode, associar o certificado ACM ao *listener* HTTPS do *load balancer*;
- **Esta secção depende de uma decisão institucional da DGADR** (qual domínio usar, quem gere o DNS) — não avançar sem essa confirmação, conforme já sinalizado em `fase-5-deploy-homologacao.md` e `fase-10-integracao-hardening-producao.md`.

---

## 12. Observabilidade — CloudWatch

- O Express Mode já ativa **Container Insights** e cria automaticamente um **Log Group** (`/ecs/<nome-do-serviço>`) por serviço — os logs da aplicação já ficam visíveis sem configuração adicional;
- Criar **alarmes CloudWatch** sobre:
  - Estado não saudável do *target group* do *load balancer* (health check a falhar);
  - Taxa elevada de respostas `5xx` no *load balancer*;
  - CPU/memória da tarefa ECS acima de um limiar sustentado;
- **CloudWatch → Alarms → Create alarm**, escolher a métrica relevante (ex. `HealthyHostCount` do *target group*), definir o limiar e uma ação (ex. notificação SNS para um e-mail da equipa).

---

## 13. Backups e recuperação

- **RDS**: os *backups* automáticos já ficaram ativos na Secção 3 (retenção mínima 7 dias); para produção, considerar aumentar a retenção e ativar **snapshots manuais** antes de cada alteração estrutural relevante;
- **S3**: o *Versioning* já ativo (Secção 4) protege contra substituições acidentais; para uma política de *backup* mais robusta, considerar **Cross-Region Replication** para uma segunda região UE, se a criticidade do conteúdo o justificar;
- **Testar o restauro** pelo menos uma vez antes de produção: criar uma instância RDS a partir de um *snapshot*, confirmar que os dados estão íntegros — conforme já exigido em `fase-5-deploy-homologacao.md`.

---

## 14. Segurança adicional (antes de produção)

- **AWS WAF**: considerar associar ao *Application Load Balancer* criado pelo Express Mode, com as regras geridas básicas da AWS (proteção contra os ataques mais comuns), especialmente relevante para uma aplicação pública da Administração Pública;
- **Rotação automática de segredos**: no Secrets Manager, ativar rotação automática para `SESSION_SECRET` e credenciais de base de dados, com um período razoável (ex. 90 dias);
- **AWS Config** / **Security Hub** (opcional, mas recomendado para conformidade institucional): ativa verificação contínua de boas práticas de configuração;
- Rever a checklist completa de segurança já definida em `fase-10-integracao-hardening-producao.md` antes de qualquer promoção formal a produção.

---

## 15. Separar Homologação de Produção

Antes de promover para produção, não reutilizar os mesmos recursos de homologação:

- **Conta AWS separada** (recomendado, via AWS Organizations) ou, no mínimo, um prefixo/etiqueta de ambiente consistente em todos os recursos (`filedoc-producao-*`);
- **RDS de produção distinto**, com o template "Production" (Multi-AZ ativo);
- **Bucket S3 de produção distinto**;
- **Serviço ECS Express Mode de produção distinto** — a **mesma imagem** já testada e promovida do ECR (nunca uma reconstrução específica para produção, conforme `fase-10-integracao-hardening-producao.md`);
- Segredos de produção gerados de raiz, nunca reutilizados de homologação.

---

## 16. Checklist final de arranque

- [ ] RDS acessível apenas a partir do *security group* do ECS, nunca publicamente;
- [ ] Bucket S3 com "Block all public access" ativo e CORS configurado apenas para os URLs finais da Web;
- [ ] Todos os segredos no Secrets Manager, nenhum em variável de ambiente em texto simples nem no código;
- [ ] Imagens publicadas no ECR com *tag* imutável rastreável ao commit, nunca só `latest`;
- [ ] `prisma migrate deploy` corrido com sucesso como passo explícito, confirmado antes de qualquer tráfego real;
- [ ] `/health` e `/ready` a responder corretamente através do URL público do Express Mode;
- [ ] CI/CD a autenticar via OIDC (sem chaves fixas), a publicar só a partir de `main`;
- [ ] Alarmes CloudWatch ativos sobre *health checks* e erros `5xx`;
- [ ] *Backup* testado com restauro real, pelo menos uma vez;
- [ ] Domínio/certificado institucional — confirmado com a DGADR ou explicitamente adiado para depois da homologação;
- [ ] Ambiente de produção separado do de homologação, nunca partilhando RDS, bucket ou segredos.

---

## 17. Estimativa de custos (ordem de grandeza, não vinculativa)

Para o perfil deste projeto (aplicação interna, tráfego baixo/moderado, um ambiente de homologação):

| Recurso | Estimativa mensal indicativa |
|---|---|
| ECS Fargate (API + Web, 1 tarefa cada, uso ligeiro) | Baixo — poucas dezenas de USD |
| Application Load Balancer (criado pelo Express Mode) | Custo fixo baixo + tráfego |
| RDS `db.t4g.micro`, Single-AZ | Baixo — dezenas de USD |
| S3 (armazenamento + pedidos) | Depende do volume de vídeos — ver `fase-5-deploy-homologacao.md`, Secção I |
| Secrets Manager | Custo fixo muito baixo por segredo |
| CloudWatch Logs/alarmes | Baixo, cresce com o volume de logs |

> Valores meramente indicativos e sujeitos a alteração pela AWS — confirmar sempre na **AWS Pricing Calculator** antes de qualquer compromisso orçamental com a DGADR. Produção com Multi-AZ, mais tarefas e mais tráfego terá um custo proporcionalmente mais alto.

---

> Este guia cobre o "como clicar" — as decisões de *porquê* (arquitetura, segurança, regras de negócio) já estão todas nas especificações de fase. Segue-o em conjunto com `fase-5-deploy-homologacao.md` e `fase-10-integracao-hardening-producao.md`, não isoladamente.
