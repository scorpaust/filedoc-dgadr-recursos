import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { AppModule } from '../../src/app.module';
import { OrphanCleanupService } from '../../src/storage/orphan-cleanup.service';
import { StorageService } from '../../src/storage/storage.service';
import { CompletedUploadPart } from '../../src/storage/storage.types';

const PDF_CONTENT_TYPE = 'application/pdf';
const PART_SIZE_BYTES = Number(
  process.env['STORAGE_MULTIPART_PART_SIZE_BYTES'],
);

function makePdfBuffer(bodyText: string): Buffer {
  return Buffer.concat([
    Buffer.from('%PDF-1.7\n', 'latin1'),
    Buffer.from(bodyText, 'utf8'),
  ]);
}

function fillDeterministicBuffer(size: number): Buffer {
  const buffer = Buffer.alloc(size);
  for (let i = 0; i < size; i += 1) {
    buffer[i] = i % 256;
  }
  return buffer;
}

// As declarações globais de `fetch` de lib.dom e de `@types/node` (undici-types)
// coexistem como sobrecargas e nenhuma delas reconhece corretamente `Buffer`/`Uint8Array`
// genérico como `BodyInit` neste TypeScript 5.7 — incompatibilidade de tipos apenas,
// não de comportamento em runtime (o corpo enviado é sempre a sequência de bytes exata).
function toRequestBody(buffer: Buffer): BodyInit {
  return new Uint8Array(buffer) as BodyInit;
}

describe('storage — fluxo real contra MinIO (upload, download com Range, multipart, limpeza de órfãos)', () => {
  let app: INestApplication;
  let storageService: StorageService;
  let orphanCleanupService: OrphanCleanupService;
  const prisma = new PrismaClient();

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    // app.init() dispara StorageService.onModuleInit(), que garante o bucket de testes.
    await app.init();
    storageService = app.get(StorageService);
    orphanCleanupService = app.get(OrphanCleanupService);
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });

  it('upload por URL pré-assinado, confirmação, validação de assinatura e download com Range', async () => {
    const fileBuffer = makePdfBuffer('conteúdo de teste de um guia real');

    const uploadResult = await storageService.createUploadUrl({
      fileName: 'guia-teste.pdf',
      mimeType: PDF_CONTENT_TYPE,
      sizeBytes: fileBuffer.byteLength,
      context: 'pdfGuide',
    });
    expect(uploadResult.mode).toBe('single');
    if (uploadResult.mode !== 'single') {
      throw new Error('esperado modo single');
    }
    expect(uploadResult.objectKey).toMatch(/^guides\/.+\.pdf$/);

    const putResponse = await fetch(uploadResult.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': PDF_CONTENT_TYPE },
      body: toRequestBody(fileBuffer),
    });
    expect(putResponse.ok).toBe(true);

    await expect(
      storageService.confirmUpload(uploadResult.objectKey),
    ).resolves.toBe(true);
    await expect(
      storageService.validateUploadedFileSignature(
        uploadResult.objectKey,
        PDF_CONTENT_TYPE,
      ),
    ).resolves.toBe(true);
    // a validação de assinatura não deve remover um objeto válido
    await expect(
      storageService.confirmUpload(uploadResult.objectKey),
    ).resolves.toBe(true);

    const downloadUrl = await storageService.createDownloadUrl(
      uploadResult.objectKey,
    );
    const rangeResponse = await fetch(downloadUrl, {
      headers: { Range: 'bytes=0-9' },
    });
    expect(rangeResponse.status).toBe(206);
    expect(rangeResponse.headers.get('content-range')).toBe(
      `bytes 0-9/${fileBuffer.byteLength}`,
    );
    const rangeBody = Buffer.from(await rangeResponse.arrayBuffer());
    expect(rangeBody.equals(fileBuffer.subarray(0, 10))).toBe(true);

    const fullResponse = await fetch(downloadUrl);
    const fullBody = Buffer.from(await fullResponse.arrayBuffer());
    expect(fullBody.equals(fileBuffer)).toBe(true);

    await storageService.deleteObject(uploadResult.objectKey);
  });

  it('confirmUpload devolve false para uma chave nunca carregada', async () => {
    await expect(
      storageService.confirmUpload('guides/nunca-existiu.pdf'),
    ).resolves.toBe(false);
  });

  it('remove automaticamente um objeto cujo conteúdo real não corresponde ao tipo MIME declarado', async () => {
    const uploadResult = await storageService.createUploadUrl({
      fileName: 'falso-guia.pdf',
      mimeType: PDF_CONTENT_TYPE,
      sizeBytes: 4,
      context: 'pdfGuide',
    });
    if (uploadResult.mode !== 'single') {
      throw new Error('esperado modo single');
    }

    // sobe um PNG real disfarçado de PDF (extensão e Content-Type declarados como PDF)
    const fakePngContent = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
    const putResponse = await fetch(uploadResult.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': PDF_CONTENT_TYPE },
      body: toRequestBody(fakePngContent),
    });
    expect(putResponse.ok).toBe(true);

    await expect(
      storageService.confirmUpload(uploadResult.objectKey),
    ).resolves.toBe(true);

    await expect(
      storageService.validateUploadedFileSignature(
        uploadResult.objectKey,
        PDF_CONTENT_TYPE,
      ),
    ).resolves.toBe(false);

    // removido automaticamente após a validação falhar
    await expect(
      storageService.confirmUpload(uploadResult.objectKey),
    ).resolves.toBe(false);
  });

  describe('multipart upload', () => {
    it('carrega um ficheiro acima do limiar em várias partes e devolve-o com integridade byte a byte', async () => {
      const totalSizeBytes = PART_SIZE_BYTES * 2 + 1024;
      const fileBuffer = fillDeterministicBuffer(totalSizeBytes);

      const uploadResult = await storageService.createUploadUrl({
        fileName: 'video-grande.mp4',
        mimeType: 'video/mp4',
        sizeBytes: fileBuffer.byteLength,
        context: 'video',
      });
      expect(uploadResult.mode).toBe('multipart');
      if (uploadResult.mode !== 'multipart') {
        throw new Error('esperado modo multipart');
      }
      expect(uploadResult.parts).toHaveLength(3);

      const completedParts: CompletedUploadPart[] = [];
      for (const part of uploadResult.parts) {
        const start = (part.partNumber - 1) * PART_SIZE_BYTES;
        const end = Math.min(start + PART_SIZE_BYTES, fileBuffer.byteLength);
        const response = await fetch(part.uploadUrl, {
          method: 'PUT',
          body: toRequestBody(fileBuffer.subarray(start, end)),
        });
        expect(response.ok).toBe(true);
        const eTag = response.headers.get('etag');
        if (!eTag) {
          throw new Error('resposta do MinIO sem cabeçalho ETag');
        }
        completedParts.push({ partNumber: part.partNumber, eTag });
      }

      await storageService.completeMultipartUpload(
        uploadResult.objectKey,
        uploadResult.uploadId,
        completedParts,
      );

      await expect(
        storageService.confirmUpload(uploadResult.objectKey),
      ).resolves.toBe(true);

      const downloadUrl = await storageService.createDownloadUrl(
        uploadResult.objectKey,
      );
      const response = await fetch(downloadUrl);
      const downloaded = Buffer.from(await response.arrayBuffer());
      expect(downloaded.equals(fileBuffer)).toBe(true);

      await storageService.deleteObject(uploadResult.objectKey);
    }, 60000);

    it('abortMultipartUpload cancela um carregamento após uma falha de rede a meio, sem deixar objeto', async () => {
      const totalSizeBytes = PART_SIZE_BYTES * 2 + 100;
      const uploadResult = await storageService.createUploadUrl({
        fileName: 'video-interrompido.mp4',
        mimeType: 'video/mp4',
        sizeBytes: totalSizeBytes,
        context: 'video',
      });
      if (uploadResult.mode !== 'multipart') {
        throw new Error('esperado modo multipart');
      }

      // simula uma interrupção de rede a meio do carregamento: só a primeira parte chega
      // a ser carregada antes de o cliente abandonar o carregamento
      const firstPart = uploadResult.parts[0];
      const response = await fetch(firstPart.uploadUrl, {
        method: 'PUT',
        body: toRequestBody(Buffer.alloc(PART_SIZE_BYTES)),
      });
      expect(response.ok).toBe(true);

      await storageService.abortMultipartUpload(
        uploadResult.objectKey,
        uploadResult.uploadId,
      );

      // depois de abandonado, o carregamento deixa de poder ser concluído
      await expect(
        storageService.completeMultipartUpload(
          uploadResult.objectKey,
          uploadResult.uploadId,
          [{ partNumber: 1, eTag: 'etag-invalido' }],
        ),
      ).rejects.toThrow();

      await expect(
        storageService.confirmUpload(uploadResult.objectKey),
      ).resolves.toBe(false);
    }, 60000);
  });

  describe('limpeza de objetos órfãos', () => {
    it('remove um objeto sem referência ativa e nunca remove um objeto referenciado, mesmo por um recurso arquivado', async () => {
      const orphanUpload = await storageService.createUploadUrl({
        fileName: 'orfao.pdf',
        mimeType: PDF_CONTENT_TYPE,
        sizeBytes: 9,
        context: 'pdfGuide',
      });
      const referencedUpload = await storageService.createUploadUrl({
        fileName: 'referenciado.pdf',
        mimeType: PDF_CONTENT_TYPE,
        sizeBytes: 9,
        context: 'pdfGuide',
      });
      if (
        orphanUpload.mode !== 'single' ||
        referencedUpload.mode !== 'single'
      ) {
        throw new Error('esperado modo single');
      }

      await fetch(orphanUpload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': PDF_CONTENT_TYPE },
        body: toRequestBody(makePdfBuffer('órfão')),
      });
      await fetch(referencedUpload.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': PDF_CONTENT_TYPE },
        body: toRequestBody(makePdfBuffer('referenciado')),
      });
      await expect(
        storageService.confirmUpload(orphanUpload.objectKey),
      ).resolves.toBe(true);
      await expect(
        storageService.confirmUpload(referencedUpload.objectKey),
      ).resolves.toBe(true);

      const archivedResource = await prisma.resource.findFirst({
        where: { status: 'ARCHIVED' },
      });
      if (!archivedResource) {
        throw new Error(
          'seed sem recurso arquivado — pré-condição do teste falhou',
        );
      }
      const previousFileObjectKey = archivedResource.fileObjectKey;
      await prisma.resource.update({
        where: { id: archivedResource.id },
        data: { fileObjectKey: referencedUpload.objectKey },
      });

      try {
        const { removed } = await orphanCleanupService.cleanupOrphanObjects();

        expect(removed).toContain(orphanUpload.objectKey);
        expect(removed).not.toContain(referencedUpload.objectKey);
        await expect(
          storageService.confirmUpload(orphanUpload.objectKey),
        ).resolves.toBe(false);
        await expect(
          storageService.confirmUpload(referencedUpload.objectKey),
        ).resolves.toBe(true);
      } finally {
        await prisma.resource.update({
          where: { id: archivedResource.id },
          data: { fileObjectKey: previousFileObjectKey },
        });
        await storageService.deleteObject(referencedUpload.objectKey);
      }
    });
  });
});
