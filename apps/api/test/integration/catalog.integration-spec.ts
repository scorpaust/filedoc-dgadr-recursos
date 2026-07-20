import { Prisma, PrismaClient } from '@prisma/client';

describe('catálogo de recursos — queries reais', () => {
  const prisma = new PrismaClient();

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('pesquisa por texto', () => {
    it('encontra recursos publicados pelo título/resumo/descrição, sem distinção de maiúsculas', async () => {
      const results = await prisma.resource.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [
            { title: { contains: 'despacho', mode: 'insensitive' } },
            { summary: { contains: 'despacho', mode: 'insensitive' } },
            { description: { contains: 'despacho', mode: 'insensitive' } },
          ],
        },
        select: { slug: true },
        orderBy: { title: 'asc' },
      });

      expect(results.map((r) => r.slug)).toEqual([
        'assinar-um-despacho-digitalmente',
        'corrigir-a-data-de-um-despacho',
      ]);
    });

    it('nunca devolve recursos em rascunho ou arquivados na pesquisa pública', async () => {
      // "corrigir-metadados-de-um-oficio" (DRAFT) e "localizar-um-processo-arquivado"
      // (ARCHIVED) partilham a palavra "processo"/"metadados" com recursos publicados —
      // a pesquisa pública nunca deve incluir DRAFT/ARCHIVED, independentemente do texto.
      const results = await prisma.resource.findMany({
        where: {
          status: 'PUBLISHED',
          OR: [{ title: { contains: 'processo', mode: 'insensitive' } }],
        },
        select: { slug: true, status: true },
      });

      expect(results.length).toBeGreaterThan(0);
      expect(results.every((r) => r.status === 'PUBLISHED')).toBe(true);
      expect(results.map((r) => r.slug)).not.toContain(
        'corrigir-metadados-de-um-oficio',
      );
      expect(results.map((r) => r.slug)).not.toContain(
        'localizar-um-processo-arquivado',
      );
    });
  });

  describe('filtros combinados', () => {
    it('filtra por tipo de recurso e dificuldade em simultâneo', async () => {
      const results = await prisma.resource.findMany({
        where: {
          status: 'PUBLISHED',
          resourceType: 'VIDEO',
          difficulty: 'INICIACAO',
        },
        select: { slug: true },
        orderBy: { slug: 'asc' },
      });

      expect(results.map((r) => r.slug)).toEqual([
        'criar-um-novo-processo-de-correspondencia',
        'registar-entrada-de-correspondencia-externa',
      ]);
    });

    it('filtra por fluxo através da relação (não por texto livre)', async () => {
      const workflow = await prisma.workflow.findUniqueOrThrow({
        where: { slug: 'assinatura' },
      });

      const results = await prisma.resource.findMany({
        where: { status: 'PUBLISHED', workflowId: workflow.id },
        select: { slug: true },
      });

      expect(results.length).toBeGreaterThan(0);
      for (const result of results) {
        expect(result.slug).toEqual(expect.any(String));
      }
    });
  });

  describe('paginação e ordenação', () => {
    it('pagina resultados publicados com skip/take, e devolve o total real', async () => {
      const where: Prisma.ResourceWhereInput = { status: 'PUBLISHED' };

      const [total, firstPage, secondPage] = await Promise.all([
        prisma.resource.count({ where }),
        prisma.resource.findMany({
          where,
          select: { slug: true },
          orderBy: { title: 'asc' },
          take: 5,
          skip: 0,
        }),
        prisma.resource.findMany({
          where,
          select: { slug: true },
          orderBy: { title: 'asc' },
          take: 5,
          skip: 5,
        }),
      ]);

      expect(total).toBe(16);
      expect(firstPage).toHaveLength(5);
      expect(secondPage).toHaveLength(5);
      const firstPageSlugs = new Set(firstPage.map((r) => r.slug));
      for (const resource of secondPage) {
        expect(firstPageSlugs.has(resource.slug)).toBe(false);
      }
    });

    it('ordena por data de publicação (mais recentes primeiro)', async () => {
      const results = await prisma.resource.findMany({
        where: { status: 'PUBLISHED' },
        select: { publishedAt: true },
        orderBy: { publishedAt: 'desc' },
        take: 3,
      });

      const dates = results.map((r) => r.publishedAt?.getTime() ?? 0);
      const sortedDescending = [...dates].sort((a, b) => b - a);
      expect(dates).toEqual(sortedDescending);
    });

    it('ordena alfabeticamente por título', async () => {
      const results = await prisma.resource.findMany({
        where: { status: 'PUBLISHED' },
        select: { title: true },
        orderBy: { title: 'asc' },
        take: 5,
      });

      const titles = results.map((r) => r.title);
      const sortedAlphabetically = [...titles].sort((a, b) =>
        a.localeCompare(b, 'pt'),
      );
      expect(titles).toEqual(sortedAlphabetically);
    });
  });

  describe('prevenção de consultas N+1', () => {
    async function countQueries(
      run: (client: PrismaClient) => Promise<unknown>,
    ): Promise<number> {
      const loggingClient = new PrismaClient({
        log: [{ emit: 'event', level: 'query' }],
      });
      let queryCount = 0;
      loggingClient.$on('query', () => {
        queryCount += 1;
      });
      try {
        await run(loggingClient);
      } finally {
        await loggingClient.$disconnect();
      }
      return queryCount;
    }

    it('lista recursos com fluxo, tipo de documento e etiquetas numa única query com `include`', async () => {
      const publishedCount = await prisma.resource.count({
        where: { status: 'PUBLISHED' },
      });

      const queryCount = await countQueries((client) =>
        client.resource.findMany({
          where: { status: 'PUBLISHED' },
          include: {
            workflow: true,
            documentType: true,
            tags: { include: { tag: true } },
          },
        }),
      );

      // O Prisma resolve `include` com uma query em lote por relação pedida (`workflow`,
      // `documentType`, `tags`, `tags.tag`) — nunca uma query por recurso devolvido (haveria
      // pelo menos `publishedCount`, como no teste de contraste abaixo). O número de queries
      // fica sempre igual a este pequeno número fixo, independentemente de quantos recursos
      // (16 aqui, poderiam ser 1600) forem devolvidos.
      expect(queryCount).toBeLessThanOrEqual(6);
      expect(queryCount).toBeLessThan(publishedCount);
    });

    it('contraste: obter o fluxo recurso a recurso (padrão N+1) escala com o número de resultados', async () => {
      const resources = await prisma.resource.findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, workflowId: true },
      });

      const queryCount = await countQueries(async (client) => {
        for (const resource of resources) {
          if (resource.workflowId) {
            await client.workflow.findUnique({
              where: { id: resource.workflowId },
            });
          }
        }
      });

      // O padrão N+1 deliberadamente ingénuo gera uma query por recurso — o oposto do
      // comportamento validado no teste anterior.
      expect(queryCount).toBe(resources.length);
      expect(queryCount).toBeGreaterThan(2);
    });
  });
});
