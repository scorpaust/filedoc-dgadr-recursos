import { HttpStatus } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import type { CurrentUserPayload } from '../auth/auth.types';
import { CreateResourceDto } from './dto/create-resource.dto';
import { ListManagementResourcesQueryDto } from './dto/list-management-resources-query.dto';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import { ResourceUploadUrlDto } from './dto/resource-upload-url.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';

const user: CurrentUserPayload = {
  id: 'user-1',
  name: 'Marta Silva',
  email: 'marta.silva@dgadr.gov.pt',
  roles: [Role.EMPLOYEE],
};

const editor: CurrentUserPayload = {
  id: 'user-3',
  name: 'João Antunes',
  email: 'joao.antunes@dgadr.gov.pt',
  roles: [Role.CONTENT_EDITOR],
};

describe('ResourcesController', () => {
  let controller: ResourcesController;
  let service: {
    search: jest.Mock;
    getBySlug: jest.Mock;
    getFileDownloadUrl: jest.Mock;
    getThumbnailDownloadUrl: jest.Mock;
    listForManagement: jest.Mock;
    getByIdForManagement: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    duplicate: jest.Mock;
    publish: jest.Mock;
    unpublish: jest.Mock;
    archive: jest.Mock;
    restore: jest.Mock;
    initUpload: jest.Mock;
    confirmUpload: jest.Mock;
  };
  let response: { redirect: jest.Mock };

  beforeEach(() => {
    service = {
      search: jest.fn(),
      getBySlug: jest.fn(),
      getFileDownloadUrl: jest.fn(),
      getThumbnailDownloadUrl: jest.fn(),
      listForManagement: jest.fn(),
      getByIdForManagement: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      duplicate: jest.fn(),
      publish: jest.fn(),
      unpublish: jest.fn(),
      archive: jest.fn(),
      restore: jest.fn(),
      initUpload: jest.fn(),
      confirmUpload: jest.fn(),
    };
    response = { redirect: jest.fn() };
    controller = new ResourcesController(
      service as unknown as ResourcesService,
    );
  });

  it('search delega no serviço com a query e as funções do utilizador autenticado', async () => {
    const query = new ListResourcesQueryDto();
    service.search.mockResolvedValue({ items: [], total: 0 });

    const result = await controller.search(query, user);

    expect(service.search).toHaveBeenCalledWith(query, user.roles);
    expect(result).toEqual({ items: [], total: 0 });
  });

  it('getBySlug delega no serviço com o slug e as funções do utilizador autenticado', async () => {
    service.getBySlug.mockResolvedValue({ resource: {}, related: [] });

    await controller.getBySlug('exemplo', user);

    expect(service.getBySlug).toHaveBeenCalledWith('exemplo', user.roles);
  });

  it('getFile redireciona (302) para o URL pré-assinado devolvido pelo serviço', async () => {
    service.getFileDownloadUrl.mockResolvedValue(
      'https://storage.example/file',
    );

    await controller.getFile('res-1', user, response as unknown as Response);

    expect(service.getFileDownloadUrl).toHaveBeenCalledWith(
      'res-1',
      user.roles,
    );
    expect(response.redirect).toHaveBeenCalledWith(
      HttpStatus.FOUND,
      'https://storage.example/file',
    );
  });

  it('getThumbnail redireciona (302) para o URL pré-assinado devolvido pelo serviço', async () => {
    service.getThumbnailDownloadUrl.mockResolvedValue(
      'https://storage.example/thumb',
    );

    await controller.getThumbnail(
      'res-1',
      user,
      response as unknown as Response,
    );

    expect(service.getThumbnailDownloadUrl).toHaveBeenCalledWith(
      'res-1',
      user.roles,
    );
    expect(response.redirect).toHaveBeenCalledWith(
      HttpStatus.FOUND,
      'https://storage.example/thumb',
    );
  });

  it('listForManagement delega no serviço com a query', async () => {
    const query = new ListManagementResourcesQueryDto();
    service.listForManagement.mockResolvedValue([]);

    await controller.listForManagement(query);

    expect(service.listForManagement).toHaveBeenCalledWith(query);
  });

  it('getByIdForManagement delega no serviço com o id', async () => {
    service.getByIdForManagement.mockResolvedValue({});
    await controller.getByIdForManagement('res-1');
    expect(service.getByIdForManagement).toHaveBeenCalledWith('res-1');
  });

  it('create delega no serviço com o corpo e o utilizador autenticado', async () => {
    const dto = new CreateResourceDto();
    service.create.mockResolvedValue({});
    await controller.create(dto, editor);
    expect(service.create).toHaveBeenCalledWith(dto, editor);
  });

  it('update delega no serviço com o id, o corpo e o utilizador autenticado', async () => {
    const dto = new UpdateResourceDto();
    service.update.mockResolvedValue({});
    await controller.update('res-1', dto, editor);
    expect(service.update).toHaveBeenCalledWith('res-1', dto, editor);
  });

  it.each(['duplicate', 'publish', 'unpublish', 'archive', 'restore'] as const)(
    '%s delega no serviço com o id e o utilizador autenticado',
    async (method) => {
      service[method].mockResolvedValue({});
      await controller[method]('res-1', editor);
      expect(service[method]).toHaveBeenCalledWith('res-1', editor);
    },
  );

  it('uploadUrl delega em initUpload na fase "init"', async () => {
    const dto = Object.assign(new ResourceUploadUrlDto(), { phase: 'init' });
    service.initUpload.mockResolvedValue({ mode: 'single' });

    await controller.uploadUrl('res-1', dto, editor);

    expect(service.initUpload).toHaveBeenCalledWith('res-1', dto);
    expect(service.confirmUpload).not.toHaveBeenCalled();
  });

  it('uploadUrl delega em confirmUpload na fase "confirm"', async () => {
    const dto = Object.assign(new ResourceUploadUrlDto(), {
      phase: 'confirm',
    });
    service.confirmUpload.mockResolvedValue({});

    await controller.uploadUrl('res-1', dto, editor);

    expect(service.confirmUpload).toHaveBeenCalledWith('res-1', dto, editor);
    expect(service.initUpload).not.toHaveBeenCalled();
  });
});
