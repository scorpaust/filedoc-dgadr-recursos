import { PrismaClient } from '@prisma/client';
import {
  documentTypeSeedData,
  tagSeedData,
  workflowSeedData,
} from '../seed-data/taxonomies.data';

export interface TaxonomyIds {
  readonly workflowIdByName: ReadonlyMap<string, string>;
  readonly documentTypeIdByName: ReadonlyMap<string, string>;
  readonly tagIdByName: ReadonlyMap<string, string>;
}

/** Idempotente: `upsert` por `slug` (tarefa A da especificação — nunca `create` direto). */
export async function seedTaxonomies(
  prisma: PrismaClient,
): Promise<TaxonomyIds> {
  const workflowIdByName = new Map<string, string>();
  for (const workflow of workflowSeedData) {
    const record = await prisma.workflow.upsert({
      where: { slug: workflow.slug },
      update: {
        name: workflow.name,
        sortOrder: workflow.sortOrder,
        isActive: true,
      },
      create: {
        name: workflow.name,
        slug: workflow.slug,
        sortOrder: workflow.sortOrder,
      },
    });
    workflowIdByName.set(workflow.name, record.id);
  }

  const documentTypeIdByName = new Map<string, string>();
  for (const documentType of documentTypeSeedData) {
    const record = await prisma.documentType.upsert({
      where: { slug: documentType.slug },
      update: {
        name: documentType.name,
        sortOrder: documentType.sortOrder,
        isActive: true,
      },
      create: {
        name: documentType.name,
        slug: documentType.slug,
        sortOrder: documentType.sortOrder,
      },
    });
    documentTypeIdByName.set(documentType.name, record.id);
  }

  const tagIdByName = new Map<string, string>();
  for (const tag of tagSeedData) {
    const record = await prisma.tag.upsert({
      where: { slug: tag.slug },
      update: { name: tag.name },
      create: { name: tag.name, slug: tag.slug },
    });
    tagIdByName.set(tag.name, record.id);
  }

  return { workflowIdByName, documentTypeIdByName, tagIdByName };
}
