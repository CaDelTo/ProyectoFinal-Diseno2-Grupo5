import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProblemDetailsToast } from '@/components/ProblemDetailsToast';

describe('spec 010 — ProblemDetailsToast', () => {
  it('renderiza title + detail', () => {
    render(
      <ProblemDetailsToast
        problem={{
          type: 'https://problems/not-found',
          title: 'Recurso no encontrado',
          status: 404,
          detail: 'El documento 123 no existe en el sistema',
        }}
      />,
    );

    expect(screen.getByText('Recurso no encontrado')).toBeInTheDocument();
    expect(screen.getByText(/123 no existe/i)).toBeInTheDocument();
  });

  it('renderiza errors[] como lista', () => {
    render(
      <ProblemDetailsToast
        problem={{
          type: 'https://problems/validation-failed',
          title: 'Datos inválidos',
          status: 400,
          errors: [
            { campo: 'correo', mensaje: 'Correo inválido' },
            { campo: 'celular', mensaje: 'Debe tener 10 dígitos' },
          ],
        }}
      />,
    );

    expect(screen.getByText(/correo inválido/i)).toBeInTheDocument();
    expect(screen.getByText(/debe tener 10 dígitos/i)).toBeInTheDocument();
  });
});
