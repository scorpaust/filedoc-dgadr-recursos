import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ValidationException } from '../common/exceptions/validation.exception';
import { slugify } from '../common/utils/slugify.util';
import { PrismaService } from '../prisma/prisma.service';
import {
  ReorderDirection,
  TaxonomyResponse,
  TaxonomyType,
} from './taxonomies.types';

export const TAXONOMY_NOT_FOUND_MESSAGE = 'Taxonomia não encontrada.';

interface TaxonomyRow {
  readonly id: string;
  readonly name: string;
  readonly isActive: boolean;
  readonly sortOrder: number;
}

interface TaxonomyRowUpdate {
  readonly name?: string;
  readonly isActive?: boolean;
  readonly sortOrder?: number;
}

/**
 * Fluxos, tipos de documento e etiquetas são três modelos Prisma distintos
 * (`Workflow`/`DocumentType`/`Tag`), sem um tipo comum gerado pelo Prisma — dispatch
 * explícito por `type` em cada operação, em vez de uma abstração genérica que exigiria
 * `any` para contornar os delegados tipados do Prisma Client.
 */
@Injectable()
export class TaxonomiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(type: TaxonomyType): Promise<readonly TaxonomyResponse[]> {
    const rows = await this.findMany(type);
    return rows.map((row) => this.toResponse(row));
  }

  async create(type: TaxonomyType, name: string): Promise<TaxonomyResponse> {
    const trimmed = name.trim();
    const rows = await this.findMany(type);
    const maxOrder = rows.reduce((max, row) => Math.max(max, row.sortOrder), 0);
    try {
      const row = await this.createRow(type, trimmed, maxOrder + 1);
      return this.toResponse(row);
    } catch (error) {
      throw this.translateSlugConflict(error);
    }
  }

  async update(
    type: TaxonomyType,
    id: string,
    name: string,
  ): Promise<TaxonomyResponse> {
    await this.findOne(type, id);
    try {
      const row = await this.updateRow(type, id, { name: name.trim() });
      return this.toResponse(row);
    } catch (error) {
      throw this.translateSlugConflict(error);
    }
  }

  async toggleActive(
    type: TaxonomyType,
    id: string,
  ): Promise<TaxonomyResponse> {
    const current = await this.findOne(type, id);
    const row = await this.updateRow(type, id, { isActive: !current.isActive });
    return this.toResponse(row);
  }

  async reorder(
    type: TaxonomyType,
    id: string,
    direction: ReorderDirection,
  ): Promise<readonly TaxonomyResponse[]> {
    const rows = [...(await this.findMany(type))].sort(
      (a, b) => a.sortOrder - b.sortOrder,
    );
    const currentIndex = rows.findIndex((row) => row.id === id);
    if (currentIndex === -1) {
      throw new NotFoundException(TAXONOMY_NOT_FOUND_MESSAGE);
    }
    const targetIndex =
      direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex >= 0 && targetIndex < rows.length) {
      const current = rows[currentIndex];
      const target = rows[targetIndex];
      await Promise.all([
        this.updateRow(type, current.id, { sortOrder: target.sortOrder }),
        this.updateRow(type, target.id, { sortOrder: current.sortOrder }),
      ]);
    }
    return this.list(type);
  }

  async delete(type: TaxonomyType, id: string): Promise<void> {
    await this.findOne(type, id);
    try {
      await this.deleteRow(type, id);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2003'
      ) {
        throw new ValidationException(
          'Não é possível eliminar; existem recursos associados.',
          { id: ['Não é possível eliminar; existem recursos associados.'] },
        );
      }
      throw error;
    }
  }

  private async findMany(type: TaxonomyType): Promise<readonly TaxonomyRow[]> {
    switch (type) {
      case 'workflow':
        return this.prisma.workflow.findMany({ orderBy: { sortOrder: 'asc' } });
      case 'documentType':
        return this.prisma.documentType.findMany({
          orderBy: { sortOrder: 'asc' },
        });
      case 'tag':
        return this.prisma.tag.findMany({ orderBy: { sortOrder: 'asc' } });
    }
  }

  private async findOne(type: TaxonomyType, id: string): Promise<TaxonomyRow> {
    const row = await this.findOneOrNull(type, id);
    if (!row) {
      throw new NotFoundException(TAXONOMY_NOT_FOUND_MESSAGE);
    }
    return row;
  }

  private async findOneOrNull(
    type: TaxonomyType,
    id: string,
  ): Promise<TaxonomyRow | null> {
    switch (type) {
      case 'workflow':
        return this.prisma.workflow.findUnique({ where: { id } });
      case 'documentType':
        return this.prisma.documentType.findUnique({ where: { id } });
      case 'tag':
        return this.prisma.tag.findUnique({ where: { id } });
    }
  }

  private async createRow(
    type: TaxonomyType,
    name: string,
    sortOrder: number,
  ): Promise<TaxonomyRow> {
    const slug = slugify(name);
    switch (type) {
      case 'workflow':
        return this.prisma.workflow.create({ data: { name, slug, sortOrder } });
      case 'documentType':
        return this.prisma.documentType.create({
          data: { name, slug, sortOrder },
        });
      case 'tag':
        return this.prisma.tag.create({ data: { name, slug, sortOrder } });
    }
  }

  private async updateRow(
    type: TaxonomyType,
    id: string,
    data: TaxonomyRowUpdate,
  ): Promise<TaxonomyRow> {
    switch (type) {
      case 'workflow':
        return this.prisma.workflow.update({ where: { id }, data });
      case 'documentType':
        return this.prisma.documentType.update({ where: { id }, data });
      case 'tag':
        return this.prisma.tag.update({ where: { id }, data });
    }
  }

  private async deleteRow(type: TaxonomyType, id: string): Promise<void> {
    switch (type) {
      case 'workflow':
        await this.prisma.workflow.delete({ where: { id } });
        return;
      case 'documentType':
        await this.prisma.documentType.delete({ where: { id } });
        return;
      case 'tag':
        await this.prisma.tag.delete({ where: { id } });
        return;
    }
  }

  private translateSlugConflict(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ValidationException('Já existe uma taxonomia com este nome.', {
        name: ['Já existe uma taxonomia com este nome.'],
      });
    }
    return error;
  }

  private toResponse(row: TaxonomyRow): TaxonomyResponse {
    return {
      id: row.id,
      label: row.name,
      order: row.sortOrder,
      active: row.isActive,
    };
  }
}
