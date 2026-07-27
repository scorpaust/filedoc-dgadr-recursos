import { StorageUploadContext } from './storage.types';

/**
 * Bloqueio explícito, independentemente do contexto ou do `Content-Type`
 * declarado (coding-standards.md, secção "Armazenamento de ficheiros").
 */
export const BLOCKED_EXECUTABLE_EXTENSIONS: readonly string[] = [
  '.exe',
  '.bat',
  '.cmd',
  '.com',
  '.msi',
  '.dll',
  '.scr',
  '.ps1',
  '.sh',
  '.jar',
  '.app',
  '.vbs',
  '.js',
  '.wsf',
  '.apk',
];

export const ALLOWED_EXTENSIONS_BY_CONTEXT: Readonly<
  Record<StorageUploadContext, readonly string[]>
> = {
  video: ['.mp4', '.webm'],
  pdfGuide: ['.pdf'],
  thumbnail: ['.jpg', '.jpeg', '.png', '.webp'],
  ticketAttachment: [
    '.pdf',
    '.jpg',
    '.jpeg',
    '.png',
    '.webp',
    '.docx',
    '.xlsx',
    '.txt',
  ],
};

export const ALLOWED_MIME_TYPES_BY_CONTEXT: Readonly<
  Record<StorageUploadContext, readonly string[]>
> = {
  video: ['video/mp4', 'video/webm'],
  pdfGuide: ['application/pdf'],
  thumbnail: ['image/jpeg', 'image/png', 'image/webp'],
  ticketAttachment: [
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ],
};

/** Prefixo do objeto por contexto — só organiza o bucket, nunca revela o nome original. */
export const STORAGE_OBJECT_KEY_PREFIX_BY_CONTEXT: Readonly<
  Record<StorageUploadContext, string>
> = {
  video: 'videos',
  pdfGuide: 'guides',
  thumbnail: 'thumbnails',
  ticketAttachment: 'ticket-attachments',
};
