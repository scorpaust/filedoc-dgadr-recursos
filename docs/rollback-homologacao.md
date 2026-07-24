# Procedimento de *rollback* — Homologação

Ver `context/features/db_ci_cd/fase-5-deploy-homologacao.md` (tarefa G) para
a especificação completa desta fase. Aplicável quando os testes de fumo
(passo 4 de `docs/deploy-homologacao.md`) ou os *health checks* (passo 5)
falham depois de um *deploy*.

## Pré-condição: migrações sempre aditivas

Este procedimento reverte a **imagem** (API/Web) para a tag anterior. Não
reverte automaticamente migrações do Prisma já aplicadas — reverter uma
migração aplicada é, em geral, uma operação manual e potencialmente
destrutiva (perda de dados numa coluna removida, por exemplo). Por isso, tal
como documentado desde a Fase 3, as migrações desta aplicação devem ser
sempre **aditivas** sempre que possível (nunca remover uma coluna/tabela na
mesma migração que a deixa de usar — fazê-lo em dois passos, num *deploy*
posterior, só depois de confirmado que a versão anterior já não está em uso
em nenhum ambiente). Cumprida esta prática, a imagem anterior continua a
funcionar contra o esquema mais recente, e o *rollback* de imagem descrito
abaixo é suficiente.

Se uma migração não aditiva chegar mesmo assim a homologação e o *rollback*
for necessário, restaurar a base de dados a partir do backup mais recente
anterior ao *deploy* (`scripts/homolog/restore-postgres.sh`) é o único
caminho seguro — com a perda de dados que isso implica para o que foi
escrito depois desse backup, inevitável neste cenário.

## Passos (reversão de imagem)

### 1. Identificar a tag anterior

A tag anterior é a que estava em `IMAGE_TAG`, em `.env.homolog`, antes do
*deploy* que falhou — anotada no passo 1 do procedimento de *deploy*
(manter um registo simples, ex.: um ficheiro de histórico local ou o
histórico de alterações a `.env.homolog` no gestor de configuração do
anfitrião escolhido).

### 2. Reverter a imagem

```bash
# Editar .env.homolog: IMAGE_TAG=<tag-anterior>
docker compose -f docker-compose.homolog.yml --env-file .env.homolog pull
docker compose -f docker-compose.homolog.yml --env-file .env.homolog up -d
```

### 3. Confirmar a reversão

```bash
scripts/homolog/smoke-test.sh
docker compose -f docker-compose.homolog.yml ps
```

O *rollback* só se considera concluído depois de os testes de fumo voltarem
a passar.

## Registo do teste deste procedimento

Conforme exigido pela tarefa G da especificação ("testar o procedimento de
rollback pelo menos uma vez nesta fase"), sem imagens reais publicadas em
`ghcr.io` disponíveis para esta sessão (sem acesso de rede/credenciais ao
registo a partir deste ambiente): o mecanismo de reversão foi validado
localmente com duas imagens construídas a partir do mesmo código-fonte e
identificadas por tags distintas (`filedoc-api:homolog-a`/`homolog-b`,
`filedoc-web:homolog-a`/`homolog-b`), simulando duas *tags* publicadas em
sequência — ver a entrada correspondente em `context/current-feature.md`
para o resultado exato desta execução. Prova o mecanismo de troca de tag e
o comportamento dos `HEALTHCHECK`/`depends_on` durante a troca, que é
exatamente o que este procedimento depende; não prova a etapa de `pull` a
partir de `ghcr.io` em si (essa fica coberta pelo próprio
`publish-images.yml`, que já publica e cujo sucesso é pré-condição do
*deploy*, não deste *rollback*). Repetir este teste contra `ghcr.io` real
assim que o anfitrião de homologação estiver confirmado, antes de depender
deste procedimento a sério.
