import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';

export interface StorageClient {
  deleteObject(objectUrl: string): Promise<void>;
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
    credentials: { accessKeyId: config.accessKey, secretAccessKey: config.secretKey },
    forcePathStyle: true,
  });

  return {
    async deleteObject(objectUrl) {
      const key = objectUrl.split(`/${config.bucket}/`)[1];
      if (!key) return;
      await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: key }));
    },
  };
}
