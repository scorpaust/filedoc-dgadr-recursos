import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  MessageVisibility,
  Prisma,
  Role,
  TicketStatus,
  UserStatus,
} from '@prisma/client';
import type { CurrentUserPayload } from '../auth/auth.types';
import { EnvironmentVariables } from '../config/env.validation';
import { PrismaService } from '../prisma/prisma.service';
import { StorageService } from '../storage/storage.service';
import { generateTicketReference } from '../support/ticket-reference.util';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CreateAttachmentDto } from './dto/create-attachment.dto';
import { CreateMessageDto } from './dto/create-message.dto';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListSupportTicketsQueryDto } from './dto/list-support-tickets-query.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import {
  CATEGORY_LABEL_TO_PRISMA,
  CATEGORY_TO_LABEL,
  CreateAttachmentResult,
  PRIORITY_LABEL_TO_PRISMA,
  PRIORITY_TO_LABEL,
  STATUS_TO_LABEL,
  SUPPORT_TICKET_INCLUDE,
  SupportAgentResponse,
  SupportTicketMessageResponse,
  SupportTicketResponse,
  SupportTicketWithRelations,
  TICKET_INCLUDE,
  TicketAttachmentResponse,
  TicketMessageResponse,
  TicketResponse,
  TicketWithRelations,
  formatRoleLabels,
} from './tickets.types';

export const TICKET_NOT_FOUND_MESSAGE = 'Pedido de suporte não encontrado.';
const MAX_REFERENCE_ATTEMPTS = 5;

// Critério único de "agente de suporte válido" (usado tanto para validar `assign` como para
// listar o roster em `listAssignableAgents` — nunca duplicado com valores diferentes).
// Tipo mutável (não `readonly Role[]`), exigido pelo filtro `in` gerado pelo Prisma.
const ASSIGNABLE_AGENT_ROLES: Role[] = [Role.SUPPORT_AGENT, Role.ADMIN];

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

  // ---------------------------------------------------------------------------
  // Vista de agente (fase-6-integracao-gestao-suporte.md) — nunca reutiliza
  // `findOwnedTicket`/`TICKET_INCLUDE`/`toResponse`/`toMessageResponse`: a autorização de
  // acesso a estes métodos é garantida a montante pelo `RolesGuard` (`SupportTicketsController`),
  // e a resposta usa sempre `SUPPORT_TICKET_INCLUDE`, que nunca filtra por `visibility`.
  // ---------------------------------------------------------------------------

  async listForAgents(
    query: ListSupportTicketsQueryDto,
    actor: CurrentUserPayload,
  ): Promise<readonly SupportTicketResponse[]> {
    const search = query.q?.trim();
    const tickets = await this.prisma.supportTicket.findMany({
      where: {
        AND: [
          this.agentVisibilityWhere(actor),
          {
            status: query.status,
            category: query.category
              ? CATEGORY_LABEL_TO_PRISMA[query.category]
              : undefined,
            priority: query.priority
              ? PRIORITY_LABEL_TO_PRISMA[query.priority]
              : undefined,
            ...(search
              ? {
                  OR: [
                    { reference: { contains: search, mode: 'insensitive' } },
                    { subject: { contains: search, mode: 'insensitive' } },
                    {
                      requester: {
                        name: { contains: search, mode: 'insensitive' },
                      },
                    },
                  ],
                }
              : {}),
          },
        ],
      },
      include: SUPPORT_TICKET_INCLUDE,
      orderBy: { updatedAt: 'desc' },
    });
    return tickets.map((ticket) => this.toSupportResponse(ticket));
  }

  async getForAgent(
    id: string,
    actor: CurrentUserPayload,
  ): Promise<SupportTicketResponse> {
    const ticket = await this.findTicketForAgent(id, actor);
    return this.toSupportResponse(ticket);
  }

  async update(
    id: string,
    dto: UpdateTicketDto,
    actor: CurrentUserPayload,
  ): Promise<SupportTicketResponse> {
    const ticket = await this.findTicketForAgent(id, actor);
    const data: Prisma.SupportTicketUpdateInput = {};
    const historyMessages: {
      authorId: string;
      content: string;
      visibility: MessageVisibility;
    }[] = [];

    if (dto.category !== undefined) {
      const category = CATEGORY_LABEL_TO_PRISMA[dto.category];
      if (category !== ticket.category) {
        data.category = category;
        historyMessages.push(
          this.buildHistoryMessage(
            actor,
            `alterou a categoria para "${dto.category}".`,
          ),
        );
      }
    }
    if (dto.priority !== undefined) {
      const priority = PRIORITY_LABEL_TO_PRISMA[dto.priority];
      if (priority !== ticket.priority) {
        data.priority = priority;
        historyMessages.push(
          this.buildHistoryMessage(
            actor,
            `alterou a prioridade para ${dto.priority}.`,
          ),
        );
      }
    }
    if (dto.status !== undefined && dto.status !== ticket.status) {
      data.status = dto.status;
      if (dto.status === TicketStatus.RESOLVED) {
        data.resolvedAt = new Date();
      }
      if (dto.status === TicketStatus.CLOSED) {
        data.closedAt = new Date();
      }
      historyMessages.push(
        this.buildHistoryMessage(
          actor,
          `alterou o estado para ${STATUS_TO_LABEL[dto.status]}.`,
        ),
      );
    }
    if (
      dto.relatedResourceId !== undefined &&
      dto.relatedResourceId !== ticket.relatedResourceId
    ) {
      // Nunca confia apenas no id enviado pelo cliente (mesmo princípio já aplicado ao
      // `agentId` de `assign`) — sem esta validação, um id inexistente (ex.: um resíduo de
      // dados mock da via de UI) faz o `connect` do Prisma falhar com um erro cru (P2025).
      const resource = await this.prisma.resource.findUnique({
        where: { id: dto.relatedResourceId },
      });
      if (!resource) {
        throw new BadRequestException(
          'O recurso indicado não existe ou já não está disponível.',
        );
      }
      data.relatedResource = { connect: { id: dto.relatedResourceId } };
      historyMessages.push(
        this.buildHistoryMessage(
          actor,
          'associou um recurso formativo a este pedido.',
        ),
      );
    }

    if (Object.keys(data).length === 0) {
      return this.toSupportResponse(ticket);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { ...data, messages: { create: historyMessages } },
      include: SUPPORT_TICKET_INCLUDE,
    });
    return this.toSupportResponse(updated);
  }

  async assign(
    id: string,
    dto: AssignTicketDto,
    actor: CurrentUserPayload,
  ): Promise<SupportTicketResponse> {
    const ticket = await this.findTicketForAgent(id, actor);
    const agent = await this.prisma.user.findFirst({
      where: {
        id: dto.agentId,
        status: UserStatus.ACTIVE,
        roles: { some: { role: { in: ASSIGNABLE_AGENT_ROLES } } },
      },
    });
    if (!agent) {
      throw new BadRequestException(
        'O utilizador indicado não é um agente de suporte válido.',
      );
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        assigneeId: agent.id,
        messages: {
          create: this.buildHistoryMessage(
            actor,
            `atribuiu o pedido a ${agent.name}.`,
          ),
        },
      },
      include: SUPPORT_TICKET_INCLUDE,
    });
    return this.toSupportResponse(updated);
  }

  async listAssignableAgents(): Promise<readonly SupportAgentResponse[]> {
    const agents = await this.prisma.user.findMany({
      where: {
        status: UserStatus.ACTIVE,
        roles: { some: { role: { in: ASSIGNABLE_AGENT_ROLES } } },
      },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    return agents;
  }

  async addAgentMessage(
    id: string,
    actor: CurrentUserPayload,
    dto: CreateMessageDto,
  ): Promise<SupportTicketMessageResponse> {
    const ticket = await this.findTicketForAgent(id, actor);
    if (ticket.status === TicketStatus.CLOSED) {
      throw new ConflictException('Não é possível responder a este pedido.');
    }
    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: actor.id,
        content: dto.content,
        visibility: MessageVisibility.PUBLIC,
      },
      include: { author: { include: { roles: true } }, attachments: true },
    });
    return this.toSupportMessageResponse(message, ticket.requesterId);
  }

  async addInternalNote(
    id: string,
    actor: CurrentUserPayload,
    dto: CreateMessageDto,
  ): Promise<SupportTicketMessageResponse> {
    const ticket = await this.findTicketForAgent(id, actor);
    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId: ticket.id,
        authorId: actor.id,
        content: dto.content,
        visibility: MessageVisibility.INTERNAL,
      },
      include: { author: { include: { roles: true } }, attachments: true },
    });
    return this.toSupportMessageResponse(message, ticket.requesterId);
  }

  async resolveForAgent(
    id: string,
    actor: CurrentUserPayload,
  ): Promise<SupportTicketResponse> {
    const ticket = await this.findTicketForAgent(id, actor);
    if (
      ticket.status === TicketStatus.RESOLVED ||
      ticket.status === TicketStatus.CLOSED
    ) {
      throw new ConflictException(
        'Este pedido não pode ser marcado como resolvido neste momento.',
      );
    }
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.RESOLVED,
        resolvedAt: new Date(),
        messages: {
          create: this.buildHistoryMessage(
            actor,
            `alterou o estado para ${STATUS_TO_LABEL[TicketStatus.RESOLVED]}.`,
          ),
        },
      },
      include: SUPPORT_TICKET_INCLUDE,
    });
    return this.toSupportResponse(updated);
  }

  async closeForAgent(
    id: string,
    actor: CurrentUserPayload,
  ): Promise<SupportTicketResponse> {
    const ticket = await this.findTicketForAgent(id, actor);
    if (ticket.status === TicketStatus.CLOSED) {
      throw new ConflictException('Este pedido já está encerrado.');
    }
    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
        messages: {
          create: this.buildHistoryMessage(
            actor,
            `alterou o estado para ${STATUS_TO_LABEL[TicketStatus.CLOSED]}.`,
          ),
        },
      },
      include: SUPPORT_TICKET_INCLUDE,
    });
    return this.toSupportResponse(updated);
  }

  private async findAnyTicket(id: string): Promise<SupportTicketWithRelations> {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id },
      include: SUPPORT_TICKET_INCLUDE,
    });
    if (!ticket) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }
    return ticket;
  }

  // Regra de visibilidade do agente (project-spec.md, secção "Agente de suporte": "consultar
  // os tickets que lhe estão atribuídos ou disponíveis"): um SUPPORT_AGENT só vê/atua sobre
  // pedidos sem atribuição (ainda "disponíveis", para poder assumi-los) ou atribuídos a si
  // próprio — nunca os já atribuídos a outro agente, que desaparecem da sua fila assim que
  // reatribuídos. `ADMIN` mantém supervisão transversal, sem esta restrição.
  private agentVisibilityWhere(
    actor: CurrentUserPayload,
  ): Prisma.SupportTicketWhereInput {
    if (actor.roles.includes(Role.ADMIN)) {
      return {};
    }
    return { OR: [{ assigneeId: null }, { assigneeId: actor.id }] };
  }

  private isVisibleToAgent(
    ticket: SupportTicketWithRelations,
    actor: CurrentUserPayload,
  ): boolean {
    return (
      actor.roles.includes(Role.ADMIN) ||
      ticket.assigneeId === null ||
      ticket.assigneeId === actor.id
    );
  }

  // Mesma mensagem/estado (`404`) de um id inexistente, nunca `403` — um pedido atribuído a
  // outro agente é tratado exatamente como inexistente para quem o consulta diretamente por
  // id, sem revelar que existe mas está fora do alcance (mesmo princípio já aplicado a
  // `findOwnedTicket`, project-spec.md secção I).
  private async findTicketForAgent(
    id: string,
    actor: CurrentUserPayload,
  ): Promise<SupportTicketWithRelations> {
    const ticket = await this.findAnyTicket(id);
    if (!this.isVisibleToAgent(ticket, actor)) {
      throw new NotFoundException(TICKET_NOT_FOUND_MESSAGE);
    }
    return ticket;
  }

  private buildHistoryMessage(
    actor: CurrentUserPayload,
    text: string,
  ): { authorId: string; content: string; visibility: MessageVisibility } {
    return {
      authorId: actor.id,
      content: `${actor.name} ${text}`,
      visibility: MessageVisibility.PUBLIC,
    };
  }

  private toSupportResponse(
    ticket: SupportTicketWithRelations,
  ): SupportTicketResponse {
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
      relatedResource: ticket.relatedResource
        ? {
            id: ticket.relatedResource.id,
            slug: ticket.relatedResource.slug,
            title: ticket.relatedResource.title,
          }
        : undefined,
      createdAt: ticket.createdAt.toISOString(),
      updatedAt: ticket.updatedAt.toISOString(),
      resolvedAt: ticket.resolvedAt?.toISOString(),
      closedAt: ticket.closedAt?.toISOString(),
      messages: ticket.messages.map((message) =>
        this.toSupportMessageResponse(message, ticket.requesterId),
      ),
    };
  }

  private toSupportMessageResponse(
    message: SupportTicketWithRelations['messages'][number],
    requesterId: string,
  ): SupportTicketMessageResponse {
    return {
      id: message.id,
      author: message.author.name,
      authorRole:
        message.authorId === requesterId
          ? undefined
          : formatRoleLabels(
              message.author.roles.map((userRole) => userRole.role),
            ),
      createdAt: message.createdAt.toISOString(),
      content: message.content,
      internal: message.visibility === MessageVisibility.INTERNAL,
      attachments:
        message.attachments.length > 0
          ? message.attachments.map((attachment) => ({
              id: attachment.id,
              fileName: attachment.originalName,
            }))
          : undefined,
    };
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
