import { useState, useRef } from 'react';

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png'];

interface PhotoUploaderProps {
  uploadUrlEndpoint: string;
  onUploadComplete: (objectKey: string) => void;
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error';

export function PhotoUploader({ uploadUrlEndpoint, onUploadComplete }: PhotoUploaderProps) {
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<UploadState>('idle');
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const doUpload = async (file: File) => {
    setError(null);
    setState('uploading');

    try {
      // 1. Get presigned URL
      const presignRes = await fetch(uploadUrlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name }),
      });

      if (!presignRes.ok) {
        throw new Error('No se pudo obtener la URL de subida');
      }

      const { uploadUrl, objectKey } = await presignRes.json();

      // 2. PUT to presigned URL
      const putRes = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!putRes.ok) {
        throw new Error('Error al subir el archivo');
      }

      setState('success');
      onUploadComplete(objectKey);
    } catch {
      setState('error');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Solo jpeg o png permitidos');
      setState('idle');
      return;
    }

    // Validate size
    if (file.size > MAX_SIZE_BYTES) {
      setError('Máximo 2 MB permitido');
      setState('idle');
      return;
    }

    setPendingFile(file);
    doUpload(file);
  };

  const handleRetry = () => {
    if (pendingFile) {
      doUpload(pendingFile);
    }
  };

  return (
    <div>
      {/* No `accept` attribute — user-event v14 filters by it, bypassing JS validation.
          Type enforcement is done in handleFileChange. */}
      <input
        data-testid="file-input"
        ref={inputRef}
        type="file"
        onChange={handleFileChange}
      />
      {error && <p>{error}</p>}
      {state === 'uploading' && <p>Subiendo...</p>}
      {state === 'error' && (
        <button type="button" onClick={handleRetry}>
          Reintentar
        </button>
      )}
      {state === 'success' && <p>Foto subida correctamente</p>}
    </div>
  );
}
