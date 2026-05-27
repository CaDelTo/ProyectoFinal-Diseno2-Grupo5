import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PersonaForm } from '@/components/PersonaForm';

describe('spec 010 — PersonaForm', () => {
  const noop = vi.fn();

  it('muestra todos los campos del brief', () => {
    render(<PersonaForm mode="crear" onSubmit={noop} />);

    expect(screen.getByLabelText(/tipo de documento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/número de documento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/primer nombre/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/apellidos/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/celular/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/fecha de nacimiento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/género/i)).toBeInTheDocument();
  });

  it('valida tipo_documento requerido', async () => {
    const user = userEvent.setup();
    render(<PersonaForm mode="crear" onSubmit={noop} />);

    await user.click(screen.getByRole('button', { name: /guardar|crear|submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/tipo de documento requerido/i)).toBeInTheDocument();
    });
  });

  it('valida nro_documento solo dígitos, máx 10', async () => {
    const user = userEvent.setup();
    render(<PersonaForm mode="crear" onSubmit={noop} />);

    await user.type(screen.getByLabelText(/número de documento/i), 'abc123!!!XY');
    await user.click(screen.getByRole('button', { name: /guardar|crear|submit/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/solo dígitos|máximo 10/i),
      ).toBeInTheDocument();
    });
  });

  it('valida primer_nombre solo letras, máx 30', async () => {
    const user = userEvent.setup();
    render(<PersonaForm mode="crear" onSubmit={noop} />);

    await user.type(screen.getByLabelText(/primer nombre/i), '123');
    await user.click(screen.getByRole('button', { name: /guardar|crear|submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/solo letras/i)).toBeInTheDocument();
    });
  });

  it('valida correo formato RFC 5322', async () => {
    const user = userEvent.setup();
    render(<PersonaForm mode="crear" onSubmit={noop} />);

    await user.type(screen.getByLabelText(/correo/i), 'no-es-correo');
    await user.click(screen.getByRole('button', { name: /guardar|crear|submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/correo inválido/i)).toBeInTheDocument();
    });
  });

  it('valida celular 10 dígitos', async () => {
    const user = userEvent.setup();
    render(<PersonaForm mode="crear" onSubmit={noop} />);

    await user.type(screen.getByLabelText(/celular/i), '123');
    await user.click(screen.getByRole('button', { name: /guardar|crear|submit/i }));

    await waitFor(() => {
      expect(screen.getByText(/10 dígitos/i)).toBeInTheDocument();
    });
  });

  it('acepta fecha tipeada en dd-mmm-yyyy', async () => {
    const user = userEvent.setup();
    render(<PersonaForm mode="crear" onSubmit={noop} />);

    const dateInput = screen.getByLabelText(/fecha de nacimiento/i);
    await user.type(dateInput, '15-ene-2000');

    expect(dateInput).toHaveValue('15-ene-2000');
  });

  it('muestra mensaje por campo cuando backend devuelve 400 con errors[]', () => {
    const serverErrors = [
      { campo: 'correo', mensaje: 'Ya existe una persona con este correo' },
    ];
    render(<PersonaForm mode="crear" onSubmit={noop} serverErrors={serverErrors} />);

    expect(
      screen.getByText(/ya existe una persona con este correo/i),
    ).toBeInTheDocument();
  });
});
