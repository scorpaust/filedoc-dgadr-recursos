export type StorageUploadContext =
  'video' | 'pdfGuide' | 'thumbnail' | 'ticketAttachment';

export interface CreateUploadUrlInput {
  readonly fileName: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly context: StorageUploadContext;
}

export interface UploadPartUrl {
  readonly partNumber: number;
  readonly uploadUrl: string;
}

export interface SingleUploadUrlResult {
  readonly mode: 'single';
  readonly objectKey: string;
  readonly uploadUrl: string;
  readonly expiresAt: Date;
}

export interface MultipartUploadResult {
  readonly mode: 'multipart';
  readonly objectKey: string;
  readonly uploadId: string;
  readonly parts: readonly UploadPartUrl[];
  readonly expiresAt: Date;
}

export type CreateUploadUrlResult =
  SingleUploadUrlResult | MultipartUploadResult;

export interface CompletedUploadPart {
  readonly partNumber: number;
  readonly eTag: string;
}

export interface StorageObjectSummary {
  readonly key: string;
  readonly lastModified: Date;
}

export interface OrphanCleanupResult {
  readonly removed: readonly string[];
}
