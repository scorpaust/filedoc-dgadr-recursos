import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateBucketCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { mockClient } from 'aws-sdk-client-mock';
import { EnvironmentVariables } from '../config/env.validation';
import { StorageService } from './storage.service';

const s3Mock = mockClient(S3Client);

const TEST_ENV: EnvironmentVariables = {
  NODE_ENV: 'test',
  PORT: 3001,
  DATABASE_URL:
    'postgresql://filedoc_test:filedoc_test@localhost:5434/filedoc_test',
  SESSION_SECRET: 'x'.repeat(32),
  SESSION_TTL: 604800,
  CORS_ALLOWED_ORIGINS: ['http://localhost:4200'],
  TRUST_PROXY: false,
  STORAGE_ENDPOINT: 'http://localhost:9000',
  STORAGE_REGION: 'us-east-1',
  STORAGE_BUCKET: 'filedoc-recursos-test',
  STORAGE_ACCESS_KEY: 'test-access-key',
  STORAGE_SECRET_KEY: 'test-secret-key',
  STORAGE_FORCE_PATH_STYLE: true,
  MAX_UPLOAD_SIZE: 500 * 1024 * 1024,
  MAX_ATTACHMENTS_PER_TICKET: 5,
  STORAGE_MULTIPART_THRESHOLD_BYTES: 100,
  STORAGE_MULTIPART_PART_SIZE_BYTES: 40,
  STORAGE_UPLOAD_URL_TTL_SECONDS: 900,
  STORAGE_DOWNLOAD_URL_TTL_SECONDS: 3600,
  STORAGE_ORPHAN_GRACE_PERIOD_SECONDS: 0,
  RETENTION_POLICY_DAYS: undefined,
};

function createConfigService(): ConfigService<EnvironmentVariables, true> {
  return {
    get: (key: keyof EnvironmentVariables) => TEST_ENV[key],
  } as unknown as ConfigService<EnvironmentVariables, true>;
}

function createService(): StorageService {
  return new StorageService(createConfigService());
}

const PDF_HEADER = Buffer.from('%PDF-1.7', 'latin1');
const PNG_HEADER = Buffer.from([0x89, 0x50, 0x4e, 0x47]);

describe('StorageService', () => {
  beforeEach(() => {
    s3Mock.reset();
  });

  describe('createUploadUrl', () => {
    it('rejeita um pedido inválido sem emitir qualquer URL nem chamar o armazenamento', async () => {
      const service = createService();

      await expect(
        service.createUploadUrl({
          fileName: 'malware.exe',
          mimeType: 'application/pdf',
          sizeBytes: 10,
          context: 'ticketAttachment',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(s3Mock.calls()).toHaveLength(0);
    });

    it('devolve um único URL pré-assinado para ficheiros dentro do limiar de multipart', async () => {
      const service = createService();

      const result = await service.createUploadUrl({
        fileName: 'guia.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 50,
        context: 'pdfGuide',
      });

      expect(result.mode).toBe('single');
      if (result.mode !== 'single') {
        throw new Error('esperado modo single');
      }
      expect(result.objectKey).toMatch(/^guides\/.+\.pdf$/);
      expect(result.uploadUrl).toContain('http://localhost:9000');
      expect(result.uploadUrl).toContain(
        encodeURIComponent(result.objectKey).replace(/%2F/g, '/'),
      );
      // nenhuma chamada de rede é necessária para assinar o URL
      expect(s3Mock.calls()).toHaveLength(0);
    });

    it('inicia um carregamento em várias partes para ficheiros acima do limiar configurado', async () => {
      s3Mock
        .on(CreateMultipartUploadCommand)
        .resolves({ UploadId: 'upload-123' });
      const service = createService();

      const result = await service.createUploadUrl({
        fileName: 'aula.mp4',
        mimeType: 'video/mp4',
        sizeBytes: 101,
        context: 'video',
      });

      expect(result.mode).toBe('multipart');
      if (result.mode !== 'multipart') {
        throw new Error('esperado modo multipart');
      }
      expect(result.uploadId).toBe('upload-123');
      // 101 bytes / 40 bytes por parte = 3 partes
      expect(result.parts).toHaveLength(3);
      expect(result.parts.map((part) => part.partNumber)).toEqual([1, 2, 3]);
      expect(result.parts.every((part) => part.uploadUrl.length > 0)).toBe(
        true,
      );
    });

    it('lança um erro claro quando o armazenamento não devolve um UploadId', async () => {
      s3Mock.on(CreateMultipartUploadCommand).resolves({});
      const service = createService();

      await expect(
        service.createUploadUrl({
          fileName: 'aula.mp4',
          mimeType: 'video/mp4',
          sizeBytes: 101,
          context: 'video',
        }),
      ).rejects.toThrow();
    });
  });

  it('completeMultipartUpload envia as partes ordenadas por número', async () => {
    s3Mock.on(CompleteMultipartUploadCommand).resolves({});
    const service = createService();

    await service.completeMultipartUpload('videos/abc.mp4', 'upload-123', [
      { partNumber: 2, eTag: 'etag-2' },
      { partNumber: 1, eTag: 'etag-1' },
    ]);

    const call = s3Mock.commandCalls(CompleteMultipartUploadCommand)[0];
    expect(call.args[0].input.MultipartUpload?.Parts).toEqual([
      { ETag: 'etag-1', PartNumber: 1 },
      { ETag: 'etag-2', PartNumber: 2 },
    ]);
  });

  it('abortMultipartUpload envia o pedido de abandono ao armazenamento', async () => {
    s3Mock.on(AbortMultipartUploadCommand).resolves({});
    const service = createService();

    await service.abortMultipartUpload('videos/abc.mp4', 'upload-123');

    expect(s3Mock.commandCalls(AbortMultipartUploadCommand)).toHaveLength(1);
  });

  it('createDownloadUrl devolve um URL pré-assinado de GET para a chave indicada', async () => {
    const service = createService();

    const url = await service.createDownloadUrl('videos/abc.mp4');

    expect(url).toContain('http://localhost:9000');
    expect(url).toContain('videos/abc.mp4');
  });

  it('deleteObject envia o pedido de eliminação ao armazenamento', async () => {
    s3Mock.on(DeleteObjectCommand).resolves({});
    const service = createService();

    await service.deleteObject('videos/abc.mp4');

    expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(1);
  });

  describe('confirmUpload', () => {
    it('devolve true quando o objeto existe no armazenamento', async () => {
      s3Mock.on(HeadObjectCommand).resolves({});
      const service = createService();

      await expect(service.confirmUpload('videos/abc.mp4')).resolves.toBe(true);
    });

    it('devolve false quando o objeto não existe', async () => {
      const notFound = Object.assign(new Error('not found'), {
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 },
      });
      s3Mock.on(HeadObjectCommand).rejects(notFound);
      const service = createService();

      await expect(service.confirmUpload('videos/abc.mp4')).resolves.toBe(
        false,
      );
    });

    it('propaga outros erros do armazenamento', async () => {
      s3Mock.on(HeadObjectCommand).rejects(new Error('falha de rede'));
      const service = createService();

      await expect(service.confirmUpload('videos/abc.mp4')).rejects.toThrow(
        'falha de rede',
      );
    });
  });

  describe('validateUploadedFileSignature', () => {
    it('confirma e mantém o objeto quando a assinatura corresponde ao tipo declarado', async () => {
      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToByteArray: () =>
            Promise.resolve(new Uint8Array(PDF_HEADER)),
        } as never,
      });
      const service = createService();

      const matches = await service.validateUploadedFileSignature(
        'guides/abc.pdf',
        'application/pdf',
      );

      expect(matches).toBe(true);
      expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(0);
    });

    it('rejeita e remove o objeto quando a assinatura não corresponde ao tipo declarado', async () => {
      s3Mock.on(GetObjectCommand).resolves({
        Body: {
          transformToByteArray: () =>
            Promise.resolve(new Uint8Array(PNG_HEADER)),
        } as never,
      });
      s3Mock.on(DeleteObjectCommand).resolves({});
      const service = createService();

      const matches = await service.validateUploadedFileSignature(
        'guides/abc.pdf',
        'application/pdf',
      );

      expect(matches).toBe(false);
      expect(s3Mock.commandCalls(DeleteObjectCommand)).toHaveLength(1);
    });
  });

  it('listAllObjects percorre todas as páginas de resultados', async () => {
    s3Mock
      .on(ListObjectsV2Command)
      .resolvesOnce({
        Contents: [
          { Key: 'videos/a.mp4', LastModified: new Date('2026-01-01') },
        ],
        IsTruncated: true,
        NextContinuationToken: 'token-2',
      })
      .resolvesOnce({
        Contents: [
          { Key: 'videos/b.mp4', LastModified: new Date('2026-01-02') },
        ],
        IsTruncated: false,
      });
    const service = createService();

    const objects = await service.listAllObjects();

    expect(objects.map((object) => object.key)).toEqual([
      'videos/a.mp4',
      'videos/b.mp4',
    ]);
  });

  describe('onModuleInit', () => {
    it('cria o bucket quando ainda não existe', async () => {
      s3Mock.on(CreateBucketCommand).resolves({});
      const service = createService();

      await service.onModuleInit();

      expect(s3Mock.commandCalls(CreateBucketCommand)).toHaveLength(1);
    });

    it('não lança quando o bucket já existe', async () => {
      s3Mock.on(CreateBucketCommand).rejects(
        Object.assign(new Error('already owned'), {
          name: 'BucketAlreadyOwnedByYou',
        }),
      );
      const service = createService();

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });

    it('não lança quando a criação falha por outro motivo (ex. permissões em produção)', async () => {
      s3Mock.on(CreateBucketCommand).rejects(new Error('access denied'));
      const service = createService();

      await expect(service.onModuleInit()).resolves.toBeUndefined();
    });
  });
});
