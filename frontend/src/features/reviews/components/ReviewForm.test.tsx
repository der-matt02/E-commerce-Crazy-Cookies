import { describe, it, expect, vi, beforeEach, afterEach, type MockInstance } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReviewForm } from './ReviewForm';

describe('ReviewForm', () => {
  let alertSpy: MockInstance<Parameters<typeof window.alert>, ReturnType<typeof window.alert>>;

  beforeEach(() => {
    alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  it('renders the form fields', () => {
    render(<ReviewForm productId="product-1" onSubmit={vi.fn()} />);

    expect(screen.getByLabelText(/Nombre/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Comentario/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar review' })).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('shows an inline error banner and does not call window.alert when required fields are missing', async () => {
    const onSubmit = vi.fn();
    // customerName/customerEmail default to '' so submitting immediately should fail validation.
    // The inputs are natively `required`, so we dispatch the submit event directly to bypass
    // jsdom's HTML5 constraint validation (which would otherwise swallow a click-triggered
    // submit) and exercise the component's own validation branch.
    const { container } = render(<ReviewForm productId="product-1" onSubmit={onSubmit} />);

    const form = container.querySelector('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(
      await screen.findByText('Por favor completa los campos obligatorios')
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('submits successfully with valid data and shows the thank-you state', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ReviewForm productId="product-1" onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Nombre/), 'Jane Doe');
    await user.type(screen.getByLabelText(/Email/), 'jane@example.com');
    await user.click(screen.getByRole('button', { name: '4 estrellas' }));
    await user.type(screen.getByLabelText(/Comentario/), 'Excelente producto');

    await user.click(screen.getByRole('button', { name: 'Enviar review' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        customerName: 'Jane Doe',
        customerEmail: 'jane@example.com',
        rating: 4,
        comment: 'Excelente producto',
      });
    });

    expect(await screen.findByText('¡Gracias por tu review!')).toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
  });

  it('shows an inline error banner (not window.alert) when the API call fails', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('Error al enviar review'));
    render(<ReviewForm productId="product-1" onSubmit={onSubmit} />);
    const user = userEvent.setup();

    await user.type(screen.getByLabelText(/Nombre/), 'Jane Doe');
    await user.type(screen.getByLabelText(/Email/), 'jane@example.com');

    await user.click(screen.getByRole('button', { name: 'Enviar review' }));

    expect(await screen.findByText('Error al enviar review')).toBeInTheDocument();
    expect(screen.queryByText('¡Gracias por tu review!')).not.toBeInTheDocument();
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
