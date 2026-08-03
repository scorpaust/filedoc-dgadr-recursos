import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateBucketCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';
import { matchesDeclaredMimeType } from './file-signature.util';
import { generateObjectKey } from './object-key.util';
import { validateUploadRequest } from './storage-validation.util';
import {
  CompletedUploadPart,
  CreateUploadUrlInput,
  CreateUploadUrlResult,
  StorageObjectSummary,
  UploadPartUrl,
} from './storage.types';

/** Primeiros bytes suficientes para identificar a assinatura de todos os tipos suportados. */
const SIGNATURE_PROBE_BYTE_RANGE = 'bytes=0-263';

function isObjectNotFoundError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as {
    name?: unknown;
    $metadata?: { httpStatusCode?: unknown };
  };
  if (candidate.name === 'NotFound' || candidate.name === 'NoSuchKey') {
    return true;
  }
  return candidate.$metadata?.httpStatusCode === 404;
}

function isBucketAlreadyExistsError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const name = (error as { name?: unknown }).name;
  return name === 'BucketAlreadyOwnedByYou' || name === 'BucketAlreadyExists';
}

/**
 * Encapsula o SDK compatível com S3 (MinIO em desenvolvimento, o serviço escolhido na
 * Fase 5 — Deployment em homologação/produção — ver `fase-2-integracao-armazenamento.md`).
 * Reutilizável pelas fases seguintes da via de Integração — nenhuma regra de negócio
 * concreta (Catálogo, Suporte, Conteúdos) vive aqui, só a mecânica de armazenamento.
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly maxUploadSizeBytes: number;
  private readonly multipartThresholdBytes: number;
  private readonly multipartPartSizeBytes: number;
  private readonly uploadUrlTtlSeconds: number;
  private readonly downloadUrlTtlSeconds: number;

  constructor(configService: ConfigService<EnvironmentVariables, true>) {
    this.bucket = configService.get('STORAGE_BUCKET', { infer: true });
    const storageAccessKey = configService.get('STORAGE_ACCESS_KEY', {
      infer: true,
    });
    const storageSecretKey = configService.get('STORAGE_SECRET_KEY', {
      infer: true,
    });
    this.client = new S3Client({
      endpoint: configService.get('STORAGE_ENDPOINT', { infer: true }),
      region: configService.get('STORAGE_REGION', { infer: true }),
      forcePathStyle: configService.get('STORAGE_FORCE_PATH_STYLE', {
        infer: true,
      }),
      // Omitido em AWS real (Task Role do ECS): sem "credentials", o SDK usa a
      // sua cadeia de credenciais por omissão (metadata endpoint do
      // contentor), sem chaves fixas a gerir/rodar. MinIO local continua a
      // exigir STORAGE_ACCESS_KEY/STORAGE_SECRET_KEY (env.validation.ts).
      ...(storageAccessKey !== undefined && storageSecretKey !== undefined
        ? {
            credentials: {
              accessKeyId: storageAccessKey,
              secretAccessKey: storageSecretKey,
            },
          }
        : {}),
    });
    this.maxUploadSizeBytes = configService.get('MAX_UPLOAD_SIZE', {
      infer: true,
    });
    this.multipartThresholdBytes = configService.get(
      'STORAGE_MULTIPART_THRESHOLD_BYTES',
      { infer: true },
    );
    this.multipartPartSizeBytes = configService.get(
      'STORAGE_MULTIPART_PART_SIZE_BYTES',
      { infer: true },
    );
    this.uploadUrlTtlSeconds = configService.get(
      'STORAGE_UPLOAD_URL_TTL_SECONDS',
      { infer: true },
    );
    this.downloadUrlTtlSeconds = configService.get(
      'STORAGE_DOWNLOAD_URL_TTL_SECONDS',
      { infer: true },
    );
  }

  /**
   * Cria o bucket se ainda não existir (privado por omissão em S3/MinIO). Uma falha aqui
   * não impede o arranque da aplicação — em produção, o bucket é tipicamente
   * pré-provisionado pela infraestrutura, sem permissão de `CreateBucket` para a
   * aplicação (princípio do menor privilégio).
   */
  async onModuleInit(): Promise<void> {
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (error) {
      if (isBucketAlreadyExistsError(error)) {
        return;
      }
      this.logger.warn(
        `Não foi possível confirmar/criar o bucket "${this.bucket}" automaticamente: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
  }

  async createUploadUrl(
    input: CreateUploadUrlInput,
  ): Promise<CreateUploadUrlResult> {
    validateUploadRequest(input, {
      maxUploadSizeBytes: this.maxUploadSizeBytes,
    });

    const objectKey = generateObjectKey(input.context, input.fileName);
    const expiresAt = new Date(Date.now() + this.uploadUrlTtlSeconds * 1000);

    if (input.sizeBytes <= this.multipartThresholdBytes) {
      const uploadUrl = await getSignedUrl(
        this.client,
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: objectKey,
          ContentType: input.mimeType,
        }),
        { expiresIn: this.uploadUrlTtlSeconds },
      );
      return { mode: 'single', objectKey, uploadUrl, expiresAt };
    }

    return this.createMultipartUpload(
      objectKey,
      input.mimeType,
      input.sizeBytes,
      expiresAt,
    );
  }

  private async createMultipartUpload(
    objectKey: string,
    mimeType: string,
    sizeBytes: number,
    expiresAt: Date,
  ): Promise<CreateUploadUrlResult> {
    const { UploadId } = await this.client.send(
      new CreateMultipartUploadCommand({
        Bucket: this.bucket,
        Key: objectKey,
        ContentType: mimeType,
      }),
    );
    if (!UploadId) {
      throw new Error(
        'O armazenamento não devolveu um identificador de carregamento em várias partes.',
      );
    }

    const partCount = Math.ceil(sizeBytes / this.multipartPartSizeBytes);
    const parts: UploadPartUrl[] = [];
    for (let partNumber = 1; partNumber <= partCount; partNumber += 1) {
      const uploadUrl = await getSignedUrl(
        this.client,
        new UploadPartCommand({
          Bucket: this.bucket,
          Key: objectKey,
          UploadId,
          PartNumber: partNumber,
        }),
        { expiresIn: this.uploadUrlTtlSeconds },
      );
      parts.push({ partNumber, uploadUrl });
    }

    return {
      mode: 'multipart',
      objectKey,
      uploadId: UploadId,
      parts,
      expiresAt,
    };
  }

  async completeMultipartUpload(
    objectKey: string,
    uploadId: string,
    parts: readonly CompletedUploadPart[],
  ): Promise<void> {
    await this.client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: objectKey,
        UploadId: uploadId,
        MultipartUpload: {
          Parts: [...parts]
            .sort((a, b) => a.partNumber - b.partNumber)
            .map((part) => ({
              ETag: part.eTag,
              PartNumber: part.partNumber,
            })),
        },
      }),
    );
  }

  async abortMultipartUpload(
    objectKey: string,
    uploadId: string,
  ): Promise<void> {
    await this.client.send(
      new AbortMultipartUploadCommand({
        Bucket: this.bucket,
        Key: objectKey,
        UploadId: uploadId,
      }),
    );
  }

  async createDownloadUrl(
    objectKey: string,
    expiresInSeconds?: number,
  ): Promise<string> {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      { expiresIn: expiresInSeconds ?? this.downloadUrlTtlSeconds },
    );
  }

  async deleteObject(objectKey: string): Promise<void> {
    await this.client.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }),
    );
  }

  /** Confirma que o objeto foi efetivamente escrito no armazenamento (evita referências órfãs). */
  async confirmUpload(objectKey: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }),
      );
      return true;
    } catch (error) {
      if (isObjectNotFoundError(error)) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Passo assíncrono pós-upload: confirma que o tipo real do ficheiro (assinatura/magic
   * bytes) corresponde ao tipo MIME declarado. Remove automaticamente o objeto quando a
   * validação falha (coding-standards.md — "validar assinatura ou conteúdo do ficheiro
   * quando tecnicamente possível").
   */
  async validateUploadedFileSignature(
    objectKey: string,
    declaredMimeType: string,
  ): Promise<boolean> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: objectKey,
        Range: SIGNATURE_PROBE_BYTE_RANGE,
      }),
    );
    const bytes = await response.Body?.transformToByteArray();
    const buffer = Buffer.from(bytes ?? new Uint8Array());
    const matches = matchesDeclaredMimeType(buffer, declaredMimeType);

    if (!matches) {
      this.logger.warn(
        `Objeto removido: a assinatura real de "${objectKey}" não corresponde ao tipo declarado (${declaredMimeType}).`,
      );
      await this.deleteObject(objectKey);
    }

    return matches;
  }

  /** Usado pela limpeza de objetos órfãos — lista todos os objetos do bucket, paginado. */
  async listAllObjects(): Promise<readonly StorageObjectSummary[]> {
    const objects: StorageObjectSummary[] = [];
    let continuationToken: string | undefined;

    do {
      const response = await this.client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          ContinuationToken: continuationToken,
        }),
      );
      for (const object of response.Contents ?? []) {
        if (object.Key && object.LastModified) {
          objects.push({ key: object.Key, lastModified: object.LastModified });
        }
      }
      continuationToken = response.IsTruncated
        ? response.NextContinuationToken
        : undefined;
    } while (continuationToken);

    return objects;
  }
}
