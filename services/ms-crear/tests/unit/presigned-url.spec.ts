import { describe, it, expect } from '@jest/globals';
import {
  getObjectKey,
  validateUpload,
  PRESIGNED_TTL_SECONDS,
} from '../../src/persona/presigned-url.js';

describe('presigned-url', () => {
  it('genera key fotos/<doc>/<uuid>.jpg correcto', () => {
    const key = getObjectKey('12345678', 'jpg');
    expect(key).toMatch(/^fotos\/12345678\/[0-9a-f-]{36}\.jpg$/);
  });

  it('rechaza size > 2MB con upload-too-large', () => {
    expect(() =>
      validateUpload({ contentType: 'image/jpeg', sizeBytes: 2_097_153 }),
    ).toThrow('upload-too-large');
  });

  it('rechaza contentType image/gif con upload-bad-type', () => {
    expect(() =>
      validateUpload({ contentType: 'image/gif', sizeBytes: 1000 }),
    ).toThrow('upload-bad-type');
  });

  it('TTL del presigned es 300s', () => {
    expect(PRESIGNED_TTL_SECONDS).toBe(300);
  });
});
