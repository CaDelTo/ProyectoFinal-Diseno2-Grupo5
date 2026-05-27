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
      const presignRes = await fetch(uploadUrlEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name }),
      });

      if (!presignRes.ok) {
        throw new Error('No se pudo obtener la URL de subida');
      }

      const { uploadUrl, objectKey } = await presignRes.json();

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

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Solo jpeg o png permitidos');
      setState('idle');
      return;
    }

    if (file.size > MAX_SIZE_BYTES) {
      setError('Máximo 2 MB permitido');
      setState('idle');
      return;
    }

    setPendingFile(file);
    doUpload(file);
  };

  const handleRetry = () => {
    if (pendingFile) doUpload(pendingFile);
  };

  return (
    <div className="space-y-2">
      {/* Drop zone / click to select */}
      <label
        htmlFor="photo-upload-input"
        className={`flex flex-col items-center justify-center gap-2 w-full h-32 rounded-xl border-2 border-dashed cursor-pointer transition-colors ${
          state === 'success'
            ? 'border-green-300 bg-green-50'
            : state === 'error'
            ? 'border-red-300 bg-red-50'
            : 'border-gray-300 bg-gray-50 hover:border-brand hover:bg-blue-50'
        }`}
      >
        {state === 'uploading' ? (
          <>
            <svg className="w-6 h-6 animate-spin text-brand" fill="none" viewBox="0 0 24 24" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span className="text-sm text-gray-600">Subiendo foto...</span>
          </>
        ) : state === 'success' ? (
          <>
            <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="text-sm text-green-700 font-medium">Foto subida correctamente</span>
          </>
        ) : (
          <>
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
            </svg>
            <span className="text-sm text-gray-500">
              <span className="font-medium text-brand">Selecciona una foto</span> o arrastra aquí
            </span>
            <span className="text-xs text-gray-400">JPEG / PNG · máx. 2 MB</span>
          </>
        )}
      </label>

      {/* No `accept` attribute — user-event v14 filters by it, bypassing JS validation.
          Type enforcement is done in handleFileChange. */}
      <input
        data-testid="file-input"
        id="photo-upload-input"
        ref={inputRef}
        type="file"
        onChange={handleFileChange}
        className="sr-only"
      />

      {error && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          {error}
        </p>
      )}

      {state === 'error' && (
        <button
          type="button"
          onClick={handleRetry}
          className="text-xs text-brand hover:underline"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}
