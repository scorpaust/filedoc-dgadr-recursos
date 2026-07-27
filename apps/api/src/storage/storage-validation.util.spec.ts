import { BadRequestException } from '@nestjs/common';
import { validateUploadRequest } from './storage-validation.util';
import { CreateUploadUrlInput } from './storage.types';

const LIMITS = { maxUploadSizeBytes: 1024 };

function makeInput(
  overrides: Partial<CreateUploadUrlInput> = {},
): CreateUploadUrlInput {
  return {
    fileName: 'guia.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 512,
    context: 'pdfGuide',
    ...overrides,
  };
}

describe('validateUploadRequest', () => {
  it('aceita um pedido válido dentro dos limites do contexto', () => {
    expect(() => validateUploadRequest(makeInput(), LIMITS)).not.toThrow();
  });

  it('rejeita ficheiros sem extensão', () => {
    expect(() =>
      validateUploadRequest(makeInput({ fileName: 'guia' }), LIMITS),
    ).toThrow(BadRequestException);
  });

  it('bloqueia extensões executáveis independentemente do contexto/MIME declarado', () => {
    expect(() =>
      validateUploadRequest(
        makeInput({
          fileName: 'malware.exe',
          mimeType: 'application/pdf',
          context: 'ticketAttachment',
        }),
        LIMITS,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejeita uma extensão não permitida para o contexto', () => {
    expect(() =>
      validateUploadRequest(
        makeInput({ fileName: 'video.mp4', context: 'pdfGuide' }),
        LIMITS,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejeita um tipo MIME não permitido para o contexto, mesmo com extensão válida', () => {
    expect(() =>
      validateUploadRequest(
        makeInput({ mimeType: 'application/octet-stream' }),
        LIMITS,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejeita um tamanho inválido (zero ou negativo)', () => {
    expect(() =>
      validateUploadRequest(makeInput({ sizeBytes: 0 }), LIMITS),
    ).toThrow(BadRequestException);
    expect(() =>
      validateUploadRequest(makeInput({ sizeBytes: -10 }), LIMITS),
    ).toThrow(BadRequestException);
  });

  it('rejeita um ficheiro acima do tamanho máximo configurado', () => {
    expect(() =>
      validateUploadRequest(makeInput({ sizeBytes: 2000 }), LIMITS),
    ).toThrow(BadRequestException);
  });

  it('aceita cada extensão/MIME permitidos por contexto', () => {
    const cases: readonly CreateUploadUrlInput[] = [
      {
        fileName: 'a.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 10,
        context: 'video',
      },
      {
        fileName: 'a.webm',
        mimeType: 'video/webm',
        sizeBytes: 10,
        context: 'video',
      },
      {
        fileName: 'a.jpg',
        mimeType: 'image/jpeg',
        sizeBytes: 10,
        context: 'thumbnail',
      },
      {
        fileName: 'a.png',
        mimeType: 'image/png',
        sizeBytes: 10,
        context: 'thumbnail',
      },
      {
        fileName: 'a.docx',
        mimeType:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        sizeBytes: 10,
        context: 'ticketAttachment',
      },
    ];

    for (const input of cases) {
      expect(() => validateUploadRequest(input, LIMITS)).not.toThrow();
    }
  });
});
