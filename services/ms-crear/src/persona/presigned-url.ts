import { randomUUID } from 'node:crypto';

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
export const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/png'] as const;
export const PRESIGNED_TTL_SECONDS = 300;

export class PresignedValidationError extends Error {
  constructor(public readonly problemType: 'upload-too-large' | 'upload-bad-type') {
    super(problemType);
    this.name = 'PresignedValidationError';
  }
}

export function getObjectKey(nro_documento: string, ext: string): string {
  return `fotos/${nro_documento}/${randomUUID()}.${ext}`;
}

export function validateUpload(params: { contentType: string; sizeBytes: number }): void {
  if (params.sizeBytes > MAX_UPLOAD_BYTES) {
    throw new PresignedValidationError('upload-too-large');
  }
  if (!(ALLOWED_CONTENT_TYPES as readonly string[]).includes(params.contentType)) {
    throw new PresignedValidationError('upload-bad-type');
  }
}
