import { HttpStatus } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { Response } from 'express';
import type { CurrentUserPayload } from '../auth/auth.types';
import { ListResourcesQueryDto } from './dto/list-resources-query.dto';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';

const user: CurrentUserPayload = {
  id: 'user-1',
  name: 'Marta Silva',
  email: 'marta.silva@dgadr.gov.pt',
  roles: [Role.EMPLOYEE],
};

describe('ResourcesController', () => {
  let controller: ResourcesController;
  let service: {
    search: jest.Mock;
    getBySlug: jest.Mock;
    getFileDownloadUrl: jest.Mock;
    getThumbnailDownloadUrl: jest.Mock;
  };
  let response: { redirect: jest.Mock };

  beforeEach(() => {
    service = {
      search: jest.fn(),
      getBySlug: jest.fn(),
      getFileDownloadUrl: jest.fn(),
      getThumbnailDownloadUrl: jest.fn(),
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
});
