import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MessageVisibility, Prisma, TicketStatus } from '@prisma/client';
import { EnvironmentVariables } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { generateTicketReference } from '../support/ticket-reference.util';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import {
  CATEGORY_LABEL_TO_PRISMA,
  CATEGORY_TO_LABEL,
  CreateAttachmentResult,
  PRIORITY_LABEL_TO_PRISMA,
  PRIORITY_TO_LABEL,
  TICKET_INCLUDE,
  TicketAttachmentResponse,
  TicketMessageResponse,
  TicketResponse,
  TicketWithRelations,
  formatRoleLabels,
} from './tickets.types';

export const TICKET_NOT_FOUND_MESSAGE = 'Pedido de suporte não encontrado.';
const MAX_REFERENCE_ATTEMPTS = 5;

// Estados em que o trabalhador ainda pode responder — `CLOSED` é definitivo
// (project-spec.md, secção H); `RESOLVED` permanece aberto a resposta até o
// trabalhador confirmar a resolução (`confirmResolution`).
const STATUSES_ALLOWING_NEW_MESSAGE: readonly TicketStatus[] = [
  TicketStatus.OPEN,
  TicketStatus.IN_PROGRESS,
  TicketStatus.WAITING_FOR_USER,
  TicketStatus.RESOLVED,
];

/**
 * Regras de negócio dos pedidos de suporte do trabalhador (fase-5-integracao-suporte-trabalhador.md).
 * Toda a autorização é por propriedade do recurso: um trabalhador só acede aos próprios
 * pedidos, e um id de outro utilizador é tratado exatamente como um id inexistente (`404`,
 * nunca `403` — project-spec.md, secção I).
 */
@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async create(
    dto: CreateTicketDto,
    requesterId: string,
  ): Promise<TicketResponse> {
    for (let attempt = 1; attempt <= MAX_REFERENCE_ATTEMPTS; attempt += 1) {
      const reference = generateTicketReference();
      try {
        const ticket = await this.prisma.supportTicket.create({
          data: {
            reference,
            subject: dto.subject,
            description: dto.description,
            category: CATEGORY_LABEL_TO_PRISMA[dto.category],
            priority: PRIORITY_LABEL_TO_PRISMA[dto.priority],
            requesterId,
            relatedResourceId: dto.relatedResourceId,
            messages: {
              create: {
                authorId: requesterId,
                content: dto.description,
                visibility: MessageVisibility.PUBLIC,
              },
            },
          },
          include: TICKET_INCLUDE,
        });
        return this.toResponse(ticket);
      } catch (error) {
        if (
          this.isDuplicateReferenceError(error) &&
          attempt < MAX_REFERENCE_ATTEMPTS
        ) {
          continue;
        }
        throw error;
      }
    }
    throw new Error(
      'Não foi possível gerar uma referência única para o pedido.',
    );
  }

  async listMine(requesterId: string): Promise<readonly TicketResponse[]> {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { requesterId },
      include: TICKET_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    return tickets.map((ticket) => this.toResponse(ticket));
  }

  async getMineById(id: string, requesterId: string): Promise<TicketResponse> {
    const ticket = await this.findOwnedTicket(id, requesterId);
    return this.toResponse(ticket);
  }

  async addMessage(
    id: string,
    requesterId: string,
    dto: CreateMessageDto,
  ): Promise<TicketMessageResponse> {
    const ticket = await this.findOwnedTicket(id, requesterId);
    if (!STATUSES_ALLOWING_NEW_MESSAGE.includes(ticket.status)) {
      throw new ConflictException('Não é possível responder a este pedido.');
    }

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: requesterId,
        content: dto.content,
        visibility: MessageVisibility.PUBLIC,
      },
      include: { author: { include: { roles: true } }, attachments: true },
    });
    return this.toMessageResponse(message, ticket.requesterId);
  }

  async createAttachment(
    id: string,
    requesterId: string,
    dto: CreateAttachmentDto,
  ): Promise<CreateAttachmentResult> {
    const ticket = await this.findOwnedTicket(id, requesterId);
    await this.assertMessageBelongsToTicket(dto.messageId, ticket.id);

    if (dto.phase === 'init') {
      await this.assertAttachmentLimitNotReached(ticket.id);
      // Validado pelo DTO (`@ValidateIf` na fase "init") — sempre definido aqui.
      return this.storageService.createUploadUrl({
        fileName: dto.fileName,
        mimeType: dto.mimeType,
        sizeBytes: dto.sizeBytes as number,
        context: 'ticketAttachment',
      });
    }

    return this.confirmAttachment(ticket.id, requesterId, dto);
  }

  async confirmResolution(
    id: string,
    requesterId: string,
  ): Promise<TicketResponse> {
    const ticket = await this.findOwnedTicket(id, requesterId);
    if (ticket.status !== TicketStatus.RESOLVED) {
      throw new ConflictException(
        'Este pedido não pode ser encerrado neste momento.',
      );
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { status: TicketStatus.CLOSED, closedAt: new Date() },
      include: TICKET_INCLUDE,
    });
    return this.toResponse(updated);
  }

  private async confirmAttachment(
    ticketId: string,
    requesterId: string,
    dto: CreateAttachmentDto,
  ): Promise<TicketAttachmentResponse> {
    // Validado pelo DTO (`@ValidateIf` na fase "confirm") — sempre definidos aqui.
    const objectKey = dto.objectKey as string;
    const size = dto.size as number;

    const uploaded = await this.storageService.confirmUpload(objectKey);
    if (!uploaded) {
      throw new BadRequestException(
        'O ficheiro não foi carregado com sucesso.',
      );
    }
    const validSignature =
      await this.storageService.validateUploadedFileSignature(
        objectKey,
        dto.mimeType,
      );
    if (!validSignature) {
      throw new BadRequestException(
        'O conteúdo do ficheiro não corresponde ao tipo declarado.',
      );
    }

    const attachment = await this.prisma.ticketAttachment.create({
      data: {
        ticketId,
        messageId: dto.messageId,
        uploadedById: requesterId,
        objectKey,
        originalName: dto.fileName,
        mimeType: dto.mimeType,
        size,
      },
    });
    return { id: attachment.id, fileName: attachment.originalName };
  }

  private async findOwnedTicket(
    id: string,
    requesterId: string,
  ): Promise<TicketWithRelations> {
    const ticket = await this.prisma.supportTicket.findFirst({
      where: { id, requesterId },
      include: TICKET_INCLUDE,
    });
    if (!ticket) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }
    return ticket;
  }

  private async assertMessageBelongsToTicket(
    messageId: string,
    ticketId: string,
  ): Promise<void> {
    const message = await this.prisma.ticketMessage.findFirst({
      where: { id: messageId, ticketId },
      select: { id: true },
    });
    if (!message) {
      throw new NotFoundException('Mensagem não encontrada.');
    }
  }

  private async assertAttachmentLimitNotReached(
    ticketId: string,
  ): Promise<void> {
    const [count, max] = await Promise.all([
      this.prisma.ticketAttachment.count({ where: { ticketId } }),
      Promise.resolve(
        this.configService.get('MAX_ATTACHMENTS_PER_TICKET', { infer: true }),
      ),
    ]);
    if (count >= max) {
      throw new BadRequestException(
        `Este pedido já atingiu o número máximo de anexos permitido (${max}).`,
      );
    }
  }

  private isDuplicateReferenceError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002' &&
      (error.meta?.target as readonly string[] | undefined)?.includes(
        'reference',
      ) === true
    );
  }

  private toResponse(ticket: TicketWithRelations): TicketResponse {
    return {
      id: ticket.id,
      reference: ticket.reference,
      subject: ticket.subject,
      description: ticket.description,
      category: CATEGORY_TO_LABEL[ticket.category],
      priority: PRIORITY_TO_LABEL[ticket.priority],
      status: ticket.status,
      requesterId: ticket.requesterId,
      requester: ticket.requester.name,
      requesterRole: formatRoleLabels(
        ticket.requester.roles.map((userRole) => userRole.role),
      ),
      assigneeId: ticket.assigneeId ?? undefined,
      relatedResourceId: ticket.relatedResourceId ?? undefined,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString(),
      closedAt: ticket.closedAt?.toISOString(),
      messages: ticket.messages.map((message) =>
        this.toMessageResponse(message, ticket.requesterId),
      ),
    };
  }

  private toMessageResponse(
    message: TicketWithRelations['messages'][number],
    requesterId: string,
  ): TicketMessageResponse {
    return {
      id: message.id,
      author: message.author.name,
      // Sem rótulo de função para mensagens do próprio trabalhador — só um agente
      // (autor diferente do solicitante) mostra a função, tal como no protótipo da
      // via de UI (`SupportTicketMockService`, Fase 6).
      authorRole:
        message.authorId === requesterId
          ? undefined
          : formatRoleLabels(
              message.author.roles.map((userRole) => userRole.role),
            ),
      createdAt: message.createdAt.toISOString(),
      content: message.content,
      internal: false,
      attachments:
        message.attachments.length > 0
          ? message.attachments.map((attachment) => ({
              id: attachment.id,
              fileName: attachment.originalName,
            }))
          : undefined,
    };
  }
}
