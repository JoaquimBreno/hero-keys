'use server';
import { Storage } from '@google-cloud/storage';
import { UploadToGcs } from './storage';

export const UploadFile = async (file) => {
  try {  
    await UploadToGcs(file);
  } catch (error) {
    console.error(error);
    return false;
  }
}
export const GetSignedUrl = async (fileName) => {
  // I am not including the key in the github repo, but this key goes in the root of the project.
  
  const storage = new Storage({ keyFilename: 'storage-key.json'});

  console.log('im here');
  const bucketName = 'hero-keys';
  await storage.bucket(bucketName).setCorsConfiguration([
    {
      maxAgeSeconds: 3600,
      method: ['GET', 'PUT'],
      origin: ['*'],
      responseHeader: ['Content-Type'],
    },
  ]);
  const file = storage.bucket(bucketName).file(fileName);

  // Gera uma URL de upload (escrita)
  const [uploadUrl] = await file.getSignedUrl({
    action: 'write',
    expires: Date.now() + 15 * 60 * 1000, // URL expira após 15 minutos
    contentType: 'application/octet-stream', // Especifique o tipo de conteúdo esperado
    version: 'v4',
  });

  // Gera uma URL de download (leitura)
  const [downloadUrl] = await file.getSignedUrl({
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000, // A URL expira após 15 minutos
    version: 'v4',
  });

  return { uploadUrl, downloadUrl };
}

// Example of how to run CORS from code - if needed
export const SetCors = async () => {
  const storage = new Storage({ keyFilename: 'storage-key.json' });
  await storage.bucket('hero-keys').setCorsConfiguration([
    {
      maxAgeSeconds: 3600,
      method: ['GET', 'PUT'],
      origin: ['*'],
      responseHeader: ['Content-Type'],
    },
  ]);
}