import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export interface StorageClient {
  getPresignedPutUrl(objectKey: string, contentType: string, ttlSeconds: number): Promise<string>;
  objectExists(objectKey: string): Promise<boolean>;
}

export function createStorageClient(config: {
  endpoint: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  region?: string;
}): StorageClient {
  const client = new S3Client({
    endpoint: config.endpoint,
    region: config.region ?? 'us-east-1',
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });

  return {
    async getPresignedPutUrl(objectKey, contentType, ttlSeconds) {
      const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        ContentType: contentType,
      });
      return getSignedUrl(client, command, { expiresIn: ttlSeconds });
    },

    async objectExists(objectKey) {
      try {
        await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: objectKey }));
        return true;
      } catch {
        return false;
      }
    },
  };
}
