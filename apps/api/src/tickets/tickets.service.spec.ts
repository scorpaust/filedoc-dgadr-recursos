import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { TICKET_NOT_FOUND_MESSAGE, TicketsService } from './tickets.service';

function makeTicket(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ticket-1',
    reference: 'SUP-2026-ABCDEF',
    subject: 'Não consigo aceder ao Filedoc',
    description: 'Descrição do pedido.',
    category: 'ACCESS_PERMISSIONS',
    priority: 'HIGH',
    status: 'OPEN',
    requesterId: 'user-1',
    assigneeId: null,
    relatedResourceId: null,
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date('2026-07-08T09:14:00.000Z'),
    updatedAt: new Date('2026-07-08T09:14:00.000Z'),
    requester: {
      id: 'user-1',
      name: 'Marta Silva',
      roles: [{ role: Role.EMPLOYEE }],
    },
    messages: [
      {
        id: 'msg-1',
        ticketId: 'ticket-1',
        authorId: 'user-1',
        content: 'Descrição do pedido.',
        visibility: 'PUBLIC',
        createdAt: new Date('2026-07-08T09:14:00.000Z'),
        author: {
          id: 'user-1',
          name: 'Marta Silva',
          roles: [{ role: Role.EMPLOYEE }],
        },
        attachments: [],
      },
    ],
    ...overrides,
  };
}

function makeCreateTicketDto(
  overrides: Partial<CreateTicketDto> = {},
): CreateTicketDto {
  const dto = new CreateTicketDto();
  Object.assign(dto, {
    subject: 'Não consigo aceder ao Filedoc',
    description: 'Descrição do pedido.',
    category: 'Acesso ou permissões',
    priority: 'alta',
    ...overrides,
  });
  return dto;
}

describe('TicketsService', () => {
  let service: TicketsService;
  let prisma: {
    supportTicket: {
      create: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
    };
    ticketMessage: { create: jest.Mock; findFirst: jest.Mock };
    ticketAttachment: { count: jest.Mock; create: jest.Mock };
  };
  let storageService: {
    createUploadUrl: jest.Mock;
    confirmUpload: jest.Mock;
    validateUploadedFileSignature: jest.Mock;
  };
  let configService: { get: jest.Mock };

  beforeEach(async () => {
    prisma = {
      supportTicket: {
        create: jest.fn(),
        findMany: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      ticketMessage: { create: jest.fn(), findFirst: jest.fn() },
      ticketAttachment: { count: jest.fn(), create: jest.fn() },
    };
    storageService = {
      createUploadUrl: jest.fn(),
      confirmUpload: jest.fn(),
      validateUploadedFileSignature: jest.fn(),
    };
    configService = { get: jest.fn().mockReturnValue(5) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: prisma },
        { provide: StorageService, useValue: storageService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get(TicketsService);
  });

  describe('create', () => {
    it('associa o solicitante autenticado, mapeia categoria/prioridade e gera uma referência', async () => {
      prisma.supportTicket.create.mockResolvedValue(makeTicket());

      const result = await service.create(makeCreateTicketDto(), 'user-1');

      expect(prisma.supportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            category: 'ACCESS_PERMISSIONS',
            priority: 'HIGH',
            requesterId: 'user-1',
            reference: expect.stringMatching(
              /^SUP-\d{4}-[0-9A-Z]{6}$/,
            ) as string,
          }) as {
            category: string;
            priority: string;
            requesterId: string;
            reference: string;
          },
        }),
      );
      expect(result.category).toBe('Acesso ou permissões');
      expect(result.priority).toBe('alta');
      expect(result.requesterId).toBe('user-1');
    });

    it('tenta novamente com uma nova referência quando ocorre uma colisão única', async () => {
      const duplicateError = new Prisma.PrismaClientKnownRequestError(
        'duplicado',
        {
          code: 'P2002',
          clientVersion: 'test',
          meta: { target: ['reference'] },
        },
      );
      prisma.supportTicket.create
        .mockRejectedValueOnce(duplicateError)
        .mockResolvedValueOnce(makeTicket());

      const result = await service.create(makeCreateTicketDto(), 'user-1');

      expect(prisma.supportTicket.create).toHaveBeenCalledTimes(2);
      expect(result.id).toBe('ticket-1');
    });
  });

  describe('listMine', () => {
    it('lista apenas os pedidos do solicitante autenticado', async () => {
      prisma.supportTicket.findMany.mockResolvedValue([makeTicket()]);

      const result = await service.listMine('user-1');

      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { requesterId: 'user-1' } }),
      );
      expect(result).toHaveLength(1);
    });
  });

  describe('getMineById', () => {
    it('devolve 404 quando o pedido não existe ou pertence a outro utilizador', async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(null);

      await expect(service.getMineById('ticket-2', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getMineById('ticket-2', 'user-1')).rejects.toThrow(
        TICKET_NOT_FOUND_MESSAGE,
      );
      expect(prisma.supportTicket.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ticket-2', requesterId: 'user-1' },
        }),
      );
    });

    it('devolve o pedido quando pertence ao solicitante', async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(makeTicket());

      const result = await service.getMineById('ticket-1', 'user-1');

      expect(result.reference).toBe('SUP-2026-ABCDEF');
    });
  });

  describe('addMessage', () => {
    it('rejeita uma nova mensagem quando o pedido está encerrado', async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(
        makeTicket({ status: 'CLOSED' }),
      );

      await expect(
        service.addMessage('ticket-1', 'user-1', { content: 'Olá' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.ticketMessage.create).not.toHaveBeenCalled();
    });

    it('cria a mensagem pública e não expõe função para o próprio solicitante', async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(makeTicket());
      prisma.ticketMessage.create.mockResolvedValue({
        id: 'msg-2',
        authorId: 'user-1',
        content: 'Obrigada pela ajuda.',
        createdAt: new Date('2026-07-08T10:00:00.000Z'),
        author: {
          id: 'user-1',
          name: 'Marta Silva',
          roles: [{ role: Role.EMPLOYEE }],
        },
        attachments: [],
      });

      const result = await service.addMessage('ticket-1', 'user-1', {
        content: 'Obrigada pela ajuda.',
      });

      expect(prisma.ticketMessage.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: 'ticket-1',
            authorId: 'user-1',
            content: 'Obrigada pela ajuda.',
            visibility: 'PUBLIC',
          }) as {
            ticketId: string;
            authorId: string;
            content: string;
            visibility: string;
          },
        }),
      );
      expect(result.authorRole).toBeUndefined();
    });

    it('mostra a função quando o autor da mensagem não é o solicitante (ex. um agente)', async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(makeTicket());
      prisma.ticketMessage.create.mockResolvedValue({
        id: 'msg-2',
        authorId: 'agent-1',
        content: 'A analisar o seu pedido.',
        createdAt: new Date('2026-07-08T10:00:00.000Z'),
        author: {
          id: 'agent-1',
          name: 'Carlos Nunes',
          roles: [{ role: Role.SUPPORT_AGENT }],
        },
        attachments: [],
      });

      const result = await service.addMessage('ticket-1', 'agent-1', {
        content: 'A analisar o seu pedido.',
      });

      expect(result.authorRole).toBe('Agente de suporte');
    });
  });

  describe('createAttachment', () => {
    const initDto: CreateAttachmentDto = Object.assign(
      new CreateAttachmentDto(),
      {
        phase: 'init',
        messageId: 'msg-1',
        fileName: 'comprovativo.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
      },
    );

    it('devolve 404 quando a mensagem não pertence ao pedido', async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(makeTicket());
      prisma.ticketMessage.findFirst.mockResolvedValue(null);

      await expect(
        service.createAttachment('ticket-1', 'user-1', initDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('rejeita a fase "init" quando o limite de anexos já foi atingido', async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(makeTicket());
      prisma.ticketMessage.findFirst.mockResolvedValue({ id: 'msg-1' });
      prisma.ticketAttachment.count.mockResolvedValue(5);
      configService.get.mockReturnValue(5);

      await expect(
        service.createAttachment('ticket-1', 'user-1', initDto),
      ).rejects.toThrow(BadRequestException);
      expect(storageService.createUploadUrl).not.toHaveBeenCalled();
    });

    it('pede um URL de carregamento ao StorageService na fase "init"', async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(makeTicket());
      prisma.ticketMessage.findFirst.mockResolvedValue({ id: 'msg-1' });
      prisma.ticketAttachment.count.mockResolvedValue(0);
      storageService.createUploadUrl.mockResolvedValue({
        mode: 'single',
        objectKey: 'ticket-attachments/abc.pdf',
        uploadUrl: 'https://storage.example/upload',
        expiresAt: new Date(),
      });

      const result = await service.createAttachment(
        'ticket-1',
        'user-1',
        initDto,
      );

      expect(storageService.createUploadUrl).toHaveBeenCalledWith({
        fileName: 'comprovativo.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        context: 'ticketAttachment',
      });
      expect(result).toMatchObject({ mode: 'single' });
    });

    const confirmDto: CreateAttachmentDto = Object.assign(
      new CreateAttachmentDto(),
      {
        phase: 'confirm',
        messageId: 'msg-1',
        fileName: 'comprovativo.pdf',
        mimeType: 'application/pdf',
        objectKey: 'ticket-attachments/abc.pdf',
        size: 1024,
      },
    );

    it('rejeita a confirmação quando o ficheiro não foi efetivamente carregado', async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(makeTicket());
      prisma.ticketMessage.findFirst.mockResolvedValue({ id: 'msg-1' });
      storageService.confirmUpload.mockResolvedValue(false);

      await expect(
        service.createAttachment('ticket-1', 'user-1', confirmDto),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.ticketAttachment.create).not.toHaveBeenCalled();
    });

    it('rejeita a confirmação quando a assinatura real não corresponde ao tipo declarado', async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(makeTicket());
      prisma.ticketMessage.findFirst.mockResolvedValue({ id: 'msg-1' });
      storageService.confirmUpload.mockResolvedValue(true);
      storageService.validateUploadedFileSignature.mockResolvedValue(false);

      await expect(
        service.createAttachment('ticket-1', 'user-1', confirmDto),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.ticketAttachment.create).not.toHaveBeenCalled();
    });

    it('associa o anexo à mensagem quando a confirmação é bem-sucedida', async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(makeTicket());
      prisma.ticketMessage.findFirst.mockResolvedValue({ id: 'msg-1' });
      storageService.confirmUpload.mockResolvedValue(true);
      storageService.validateUploadedFileSignature.mockResolvedValue(true);
      prisma.ticketAttachment.create.mockResolvedValue({
        id: 'att-1',
        originalName: 'comprovativo.pdf',
      });

      const result = await service.createAttachment(
        'ticket-1',
        'user-1',
        confirmDto,
      );

      expect(prisma.ticketAttachment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketId: 'ticket-1',
            messageId: 'msg-1',
            uploadedById: 'user-1',
            objectKey: 'ticket-attachments/abc.pdf',
          }) as {
            ticketId: string;
            messageId: string;
            uploadedById: string;
            objectKey: string;
          },
        }),
      );
      expect(result).toEqual({ id: 'att-1', fileName: 'comprovativo.pdf' });
    });
  });

  describe('confirmResolution', () => {
    it('só permite encerrar quando o estado é RESOLVED', async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(
        makeTicket({ status: 'OPEN' }),
      );

      await expect(
        service.confirmResolution('ticket-1', 'user-1'),
      ).rejects.toThrow(ConflictException);
      expect(prisma.supportTicket.update).not.toHaveBeenCalled();
    });

    it('transita para CLOSED e define closedAt quando o estado é RESOLVED', async () => {
      prisma.supportTicket.findFirst.mockResolvedValue(
        makeTicket({ status: 'RESOLVED' }),
      );
      prisma.supportTicket.update.mockResolvedValue(
        makeTicket({ status: 'CLOSED' }),
      );

      const result = await service.confirmResolution('ticket-1', 'user-1');

      expect(prisma.supportTicket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'ticket-1' },
          data: expect.objectContaining({ status: 'CLOSED' }) as {
            status: string;
          },
        }),
      );
      expect(result.status).toBe('CLOSED');
    });
  });
});
