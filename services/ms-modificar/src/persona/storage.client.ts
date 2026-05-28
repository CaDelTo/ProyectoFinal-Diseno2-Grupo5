import { S3Client, DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageClient {
  getPresignedPutUrl(objectKey: string, contentType: string, ttlSeconds: number): Promise<string>;
  deleteObject(objectKey: string): Promise<void>;
}

export function createStorageClient(config: {
  endpoint: string;
  /** Endpoint público para URLs prefirmadas (accesible desde el browser). */
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
      return getSignedUrl(publicClient, command, { expiresIn: ttlSeconds });
    },

    async deleteObject(objectKey) {
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: objectKey }));
    },
  };
}
