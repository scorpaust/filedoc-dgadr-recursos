import { BadRequestException } from '@nestjs/common';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { ReorderTaxonomyDto } from './dto/reorder-taxonomy.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { TaxonomiesController } from './taxonomies.controller';
import { TaxonomiesService } from './taxonomies.service';

describe('TaxonomiesController', () => {
  let controller: TaxonomiesController;
  let service: {
    list: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
    toggleActive: jest.Mock;
    reorder: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    service = {
      list: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      toggleActive: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
    };
    controller = new TaxonomiesController(
      service as unknown as TaxonomiesService,
    );
  });

  it('list delega no serviço com o tipo validado', async () => {
    service.list.mockResolvedValue([]);
    await controller.list('workflow');
    expect(service.list).toHaveBeenCalledWith('workflow');
  });

  it('rejeita um tipo de taxonomia desconhecido antes de chamar o serviço', () => {
    expect(() => controller.list('invalido')).toThrow(BadRequestException);
    expect(service.list).not.toHaveBeenCalled();
  });

  it('create delega no serviço com o tipo e o nome', async () => {
    const dto = Object.assign(new CreateTaxonomyDto(), { name: 'Nova' });
    service.create.mockResolvedValue({});
    await controller.create('tag', dto);
    expect(service.create).toHaveBeenCalledWith('tag', 'Nova');
  });

  it('update delega no serviço com o tipo, o id e o nome', async () => {
    const dto = Object.assign(new UpdateTaxonomyDto(), { name: 'Atualizada' });
    service.update.mockResolvedValue({});
    await controller.update('tag', 'tag-1', dto);
    expect(service.update).toHaveBeenCalledWith('tag', 'tag-1', 'Atualizada');
  });

  it('toggleActive delega no serviço com o tipo e o id', async () => {
    service.toggleActive.mockResolvedValue({});
    await controller.toggleActive('workflow', 'wf-1');
    expect(service.toggleActive).toHaveBeenCalledWith('workflow', 'wf-1');
  });

  it('reorder delega no serviço com o tipo, o id e a direção', async () => {
    const dto = Object.assign(new ReorderTaxonomyDto(), {
      id: 'wf-1',
      direction: 'down',
    });
    service.reorder.mockResolvedValue([]);
    await controller.reorder('workflow', dto);
    expect(service.reorder).toHaveBeenCalledWith('workflow', 'wf-1', 'down');
  });

  it('delete delega no serviço com o tipo e o id', async () => {
    service.delete.mockResolvedValue(undefined);
    await controller.delete('documentType', 'dt-1');
    expect(service.delete).toHaveBeenCalledWith('documentType', 'dt-1');
  });
});
