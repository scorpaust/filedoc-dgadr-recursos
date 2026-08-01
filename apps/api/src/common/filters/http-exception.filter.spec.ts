import {
  ArgumentsHost,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ValidationException } from '../exceptions/validation.exception';
import { HttpExceptionFilter } from './http-exception.filter';

type JsonBody = Record<string, unknown>;
type ResponseMock = {
  status: jest.Mock<ResponseMock, [number]>;
  json: jest.Mock<void, [JsonBody]>;
};

function makeHost(
  response: ResponseMock,
  request: { correlationId?: string } = {},
): ArgumentsHost {
  return {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
}

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;
  let response: ResponseMock;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
    response = {
      status: jest.fn<ResponseMock, [number]>(),
      json: jest.fn<void, [JsonBody]>(),
    };
    response.status.mockReturnValue(response);
  });

  it('mapeia uma NotFoundException para o código NOT_FOUND, com mensagem, correlationId e timestamp', () => {
    filter.catch(
      new NotFoundException('Recurso não encontrado.'),
      makeHost(response),
    );

    expect(response.status).toHaveBeenCalledWith(404);
    const body = response.json.mock.calls[0][0];
    expect(body).toMatchObject({
      code: 'NOT_FOUND',
      message: 'Recurso não encontrado.',
    });
    expect(typeof body.correlationId).toBe('string');
    expect(typeof body.timestamp).toBe('string');
    expect(body.fieldErrors).toBeUndefined();
  });

  it('mapeia uma ForbiddenException para o código FORBIDDEN', () => {
    filter.catch(new ForbiddenException('Sem permissão.'), makeHost(response));

    expect(response.status).toHaveBeenCalledWith(403);
    expect(response.json.mock.calls[0][0]).toMatchObject({ code: 'FORBIDDEN' });
  });

  it('devolve fieldErrors quando a exceção os inclui (ValidationException)', () => {
    filter.catch(
      new ValidationException('Campos em falta.', {
        slug: ['Já existe um recurso com este slug.'],
      }),
      makeHost(response),
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json.mock.calls[0][0]).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Campos em falta.',
      fieldErrors: { slug: ['Já existe um recurso com este slug.'] },
    });
  });

  it('junta um array de mensagens (BadRequestException por omissão do Nest) numa única string', () => {
    filter.catch(
      new BadRequestException(['Campo obrigatório.']),
      makeHost(response),
    );

    expect(response.json.mock.calls[0][0]).toMatchObject({
      code: 'VALIDATION_ERROR',
      message: 'Campo obrigatório.',
    });
  });

  it('aceita uma resposta de exceção que seja uma string simples (não um objeto)', () => {
    filter.catch(
      new HttpException('Pedido inválido.', HttpStatus.BAD_REQUEST),
      makeHost(response),
    );

    expect(response.json.mock.calls[0][0]).toMatchObject({
      message: 'Pedido inválido.',
    });
  });

  it('reaproveita o correlationId já atribuído ao pedido por correlationIdMiddleware', () => {
    filter.catch(
      new NotFoundException('Recurso não encontrado.'),
      makeHost(response, { correlationId: 'corr-123' }),
    );

    expect(response.json.mock.calls[0][0]).toMatchObject({
      correlationId: 'corr-123',
    });
  });

  it('usa uma mensagem genérica quando a resposta da exceção não tem `message`', () => {
    filter.catch(
      new HttpException({ statusCode: 400 }, HttpStatus.BAD_REQUEST),
      makeHost(response),
    );

    expect(response.json.mock.calls[0][0]).toMatchObject({
      message: 'Não foi possível concluir o pedido.',
    });
  });
});
