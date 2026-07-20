import { PrismaClient, ResourceType } from '@prisma/client';
import { resourceSeedData } from '../seed-data/resources.data';
import type { TaxonomyIds } from './taxonomies.seed';
import { toUtcDate } from './utc-date';

export interface SeedResourcesParams {
  readonly taxonomies: TaxonomyIds;
  readonly userIdByKey: ReadonlyMap<string, string>;
}

/** Idempotente: `upsert` por `slug` (tarefa C da especificação). */
export async function seedResources(
  prisma: PrismaClient,
  { taxonomies, userIdByKey }: SeedResourcesParams,
): Promise<ReadonlyMap<string, string>> {
  const resourceIdBySlug = new Map<string, string>();

  for (const resource of resourceSeedData) {
    const workflowId = taxonomies.workflowIdByName.get(resource.workflowName);
    const documentTypeId = taxonomies.documentTypeIdByName.get(
      resource.documentTypeName,
    );
    const authorId = userIdByKey.get(resource.authorKey);

    if (!workflowId || !documentTypeId || !authorId) {
      throw new Error(
        `Dados de seed inconsistentes para o recurso "${resource.slug}".`,
      );
    }

    const isVideo = resource.resourceType === ResourceType.VIDEO;
    // Referências simbólicas — nenhum ficheiro binário real é criado nesta fase
    // (o armazenamento real em MinIO só é testado na via de integração de funcionalidades).
    const objectKeyBase = `dev-seed/resources/${resource.slug}`;
    const publishedAt = resource.publishedAt
      ? toUtcDate(resource.publishedAt)
      : null;

    const sharedFields = {
      title: resource.title,
      summary: resource.summary,
      description: resource.description,
      resourceType: resource.resourceType,
      difficulty: resource.difficulty,
      workflowId,
      documentTypeId,
      status: resource.status,
      durationMinutes: isVideo ? 0 : null,
      pageCount: isVideo ? null : 3,
      fileObjectKey: `${objectKeyBase}/main.${isVideo ? 'mp4' : 'pdf'}`,
      thumbnailObjectKey: `${objectKeyBase}/thumbnail.jpg`,
      captionObjectKey: isVideo ? `${objectKeyBase}/captions.vtt` : null,
      publishedAt,
    };

    const record = await prisma.resource.upsert({
      where: { slug: resource.slug },
      update: { ...sharedFields, updatedById: authorId },
      create: {
        ...sharedFields,
        slug: resource.slug,
        createdById: authorId,
        updatedById: authorId,
      },
    });
    resourceIdBySlug.set(resource.slug, record.id);

    for (const tagName of resource.tagNames) {
      const tagId = taxonomies.tagIdByName.get(tagName);
      if (!tagId) {
        throw new Error(
          `Etiqueta de seed desconhecida "${tagName}" para o recurso "${resource.slug}".`,
        );
      }
      await prisma.resourceTag.upsert({
        where: { resourceId_tagId: { resourceId: record.id, tagId } },
        update: {},
        create: { resourceId: record.id, tagId },
      });
    }
  }

  return resourceIdBySlug;
}
