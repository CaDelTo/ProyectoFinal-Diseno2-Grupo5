import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';

export interface StorageClient {
  getPresignedPutUrl(objectKey: string, contentType: string, ttlSeconds: number): Promise<string>;
  objectExists(objectKey: string): Promise<boolean>;
}

export function createStorageClient(config: {
  endpoint: string;
  /** Endpoint público para las URLs prefirmadas (accesible desde el browser). */
  publicEndpoint?: string;
  bucket: string;
  accessKey: string;
  secretKey: string;
  region?: string;
}): StorageClient {
  const makeClient = (endpoint: string) =>
    new S3Client({
      endpoint,
      region: config.region ?? 'us-east-1',
      credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
      forcePathStyle: true,
    });

  const client       = makeClient(config.endpoint);
  const publicClient = config.publicEndpoint ? makeClient(config.publicEndpoint) : client;

  return {
    async getPresignedPutUrl(objectKey, contentType, ttlSeconds) {
      const command = new PutObjectCommand({
        Bucket: config.bucket,
        Key: objectKey,
        ContentType: contentType,
      });
      // Usa el cliente público para que la URL apunte al host accesible desde el browser
      return getSignedUrl(publicClient, command, { expiresIn: ttlSeconds });
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
