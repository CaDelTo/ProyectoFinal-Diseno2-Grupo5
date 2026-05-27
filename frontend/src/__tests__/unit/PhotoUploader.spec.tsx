import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PhotoUploader } from '@/components/PhotoUploader';

// Mock fetch/ky para los tests
const mockFetch = vi.fn();

beforeEach(() => {
  vi.resetAllMocks();
  global.fetch = mockFetch;
});

describe('spec 010 — PhotoUploader', () => {
  const onUploadComplete = vi.fn();

  it('rechaza archivos > 2MB sin tocar red', async () => {
    const user = userEvent.setup();
    render(
      <PhotoUploader
        onUploadComplete={onUploadComplete}
        uploadUrlEndpoint="/api/v1/personas/_upload-url"
      />,
    );

    // Crea un archivo de 3MB
    const bigFile = new File(['x'.repeat(3 * 1024 * 1024)], 'foto.jpg', {
      type: 'image/jpeg',
    });

    const input = screen.getByTestId('file-input');
    await user.upload(input, bigFile);

    expect(screen.getByText(/máximo 2 MB/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
    expect(onUploadComplete).not.toHaveBeenCalled();
  });

  it('rechaza archivos image/gif', async () => {
    const user = userEvent.setup();
    render(
      <PhotoUploader
        onUploadComplete={onUploadComplete}
        uploadUrlEndpoint="/api/v1/personas/_upload-url"
      />,
    );

    const gifFile = new File(['GIF89a'], 'anim.gif', { type: 'image/gif' });
    const input = screen.getByTestId('file-input');
    await user.upload(input, gifFile);

    expect(screen.getByText(/solo jpeg o png/i)).toBeInTheDocument();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('sube vía presigned URL y reporta progress', async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uploadUrl: 'http://storage/presigned',
          objectKey: 'fotos/abc/foto.jpg',
        }),
      })
      .mockResolvedValueOnce({ ok: true });

    render(
      <PhotoUploader
        onUploadComplete={onUploadComplete}
        uploadUrlEndpoint="/api/v1/personas/_upload-url"
      />,
    );

    const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('file-input');
    await user.upload(input, file);

    await waitFor(() => {
      expect(onUploadComplete).toHaveBeenCalledWith('fotos/abc/foto.jpg');
    });
  });

  it('on error de PUT muestra retry', async () => {
    const user = userEvent.setup();

    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          uploadUrl: 'http://storage/presigned',
          objectKey: 'fotos/abc/foto.jpg',
        }),
      })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    render(
      <PhotoUploader
        onUploadComplete={onUploadComplete}
        uploadUrlEndpoint="/api/v1/personas/_upload-url"
      />,
    );

    const file = new File(['img'], 'foto.jpg', { type: 'image/jpeg' });
    const input = screen.getByTestId('file-input');
    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
    });
  });
});
