import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import CalculadoraSolar from './CalculadoraSolar';
import { renderWithProviders as render, jsonResponse, mockFetch } from './test/renderWithProviders';

afterEach(() => vi.unstubAllGlobals());

const field = (container, name) => container.querySelector(`[name="${name}"]`);

const calcResult = { paneles_necesarios: 5, capacidad_inversor: 1875, baterias_necesarias: 4 };

describe('CalculadoraSolar', () => {
  it('muestra los valores por defecto del sistema', () => {
    const { container } = render(<CalculadoraSolar />);
    expect(screen.getByRole('heading', { name: 'Calculadora Solar' })).toBeInTheDocument();
    expect(field(container, 'consumo_diario')).toHaveValue(null);
    expect(field(container, 'voltaje_sistema')).toHaveValue('24');
    expect(field(container, 'potencia_panel')).toHaveValue(400);
  });

  it('exige valores mayores a cero antes de calcular', () => {
    const fetchMock = mockFetch(() => jsonResponse({}));
    const { container } = render(<CalculadoraSolar />);
    fireEvent.change(field(container, 'consumo_diario'), { target: { value: '0' } });
    fireEvent.submit(container.querySelector('form'));
    expect(screen.getByText(/valores numéricos mayores a cero/)).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calcula y muestra los resultados', async () => {
    const fetchMock = mockFetch(() => jsonResponse(calcResult));
    const { container } = render(<CalculadoraSolar />);
    await userEvent.type(field(container, 'consumo_diario'), '5000');
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }));

    expect(await screen.findByText('5 uds')).toBeInTheDocument();
    expect(screen.getByText('1875 W')).toBeInTheDocument();
    expect(screen.getByText('4 uds')).toBeInTheDocument();
    expect(screen.getByText(/Módulos solares de 400W/)).toBeInTheDocument();

    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toMatch(/\/solar\/calculate$/);
    const body = JSON.parse(opts.body);
    expect(body).toMatchObject({ consumo_diario: 5000, voltaje_sistema: 24, averageDailyConsumptionKWh: 5, orientation: 'SUR' });
    expect(body.location.city).toBe('Bogota');
  });

  it('muestra el error del API si el cálculo falla', async () => {
    mockFetch(() => jsonResponse({ message: 'Missing required field: consumo_diario' }, false));
    const { container } = render(<CalculadoraSolar />);
    await userEvent.type(field(container, 'consumo_diario'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }));
    expect(await screen.findByText('Missing required field: consumo_diario')).toBeInTheDocument();
  });

  it('usa un mensaje por defecto si el API no envía uno', async () => {
    mockFetch(() => jsonResponse({}, false));
    const { container } = render(<CalculadoraSolar />);
    await userEvent.type(field(container, 'consumo_diario'), '100');
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }));
    expect(await screen.findByText('Error en el cálculo')).toBeInTheDocument();
  });

  it('Limpiar restablece el formulario y oculta resultados', async () => {
    mockFetch(() => jsonResponse(calcResult));
    const { container } = render(<CalculadoraSolar />);
    await userEvent.type(field(container, 'consumo_diario'), '5000');
    await userEvent.click(screen.getByRole('button', { name: 'Calcular' }));
    await screen.findByText('5 uds');
    fireEvent.change(field(container, 'voltaje_sistema'), { target: { value: '48' } });

    await userEvent.click(screen.getByRole('button', { name: 'Limpiar' }));

    expect(screen.queryByText('5 uds')).not.toBeInTheDocument();
    expect(field(container, 'consumo_diario')).toHaveValue(null);
    expect(field(container, 'voltaje_sistema')).toHaveValue('24');
  });

  describe('exportar PDF', () => {
    const openModal = async () => {
      const utils = render(<CalculadoraSolar />);
      await userEvent.click(screen.getByRole('button', { name: 'Exportar PDF' }));
      return utils;
    };

    it('abre el modal de datos del cliente y se puede cancelar', async () => {
      await openModal();
      expect(screen.getByText('Datos del Cliente (Opcional)')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByText('Datos del Cliente (Opcional)')).not.toBeInTheDocument();
    });

    it('genera el PDF con los datos del cliente y dispara la descarga', async () => {
      const createUrl = vi.fn(() => 'blob:fake');
      const revokeUrl = vi.fn();
      window.URL.createObjectURL = createUrl;
      window.URL.revokeObjectURL = revokeUrl;
      const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
      const fetchMock = mockFetch(() => Promise.resolve({ ok: true, blob: () => Promise.resolve(new Blob(['%PDF'])) }));

      await openModal();
      await userEvent.type(screen.getByPlaceholderText('Ej. Juan Pérez'), 'Cliente Demo');
      await userEvent.type(screen.getByPlaceholderText('Ej. Bogotá'), 'Villavicencio');
      await userEvent.type(screen.getByPlaceholderText('Ej. Calle 123 #45-67'), 'Calle 1');
      await userEvent.type(screen.getByPlaceholderText('Ej. 3001234567'), '3000000000');
      await userEvent.type(screen.getByPlaceholderText('Ej. juan@correo.com'), 'c@x.co');
      await userEvent.click(screen.getByRole('button', { name: 'Generar PDF' }));

      await waitFor(() => expect(clickSpy).toHaveBeenCalled());
      const [url, opts] = fetchMock.mock.calls[0];
      expect(url).toMatch(/\/solar\/export-pdf$/);
      const body = JSON.parse(opts.body);
      expect(body.cliente).toMatchObject({ nombre: 'Cliente Demo', ciudad: 'Villavicencio' });
      expect(body.location.city).toBe('Villavicencio');
      // valores por defecto cuando el consumo está vacío
      expect(body).toMatchObject({ consumo_diario: 0, voltaje_sistema: 24, potencia_pico: 1500 });
      expect(createUrl).toHaveBeenCalled();
      expect(revokeUrl).toHaveBeenCalledWith('blob:fake');
    });

    it('muestra el error si el API rechaza el PDF', async () => {
      mockFetch(() => jsonResponse({ message: 'No autorizado' }, false, 401));
      await openModal();
      await userEvent.click(screen.getByRole('button', { name: 'Generar PDF' }));
      expect(await screen.findByText('No autorizado')).toBeInTheDocument();
    });

    it('usa un mensaje por defecto si el error no trae texto', async () => {
      mockFetch(() => jsonResponse({}, false, 500));
      await openModal();
      await userEvent.click(screen.getByRole('button', { name: 'Generar PDF' }));
      expect(await screen.findByText('Error al generar el PDF del reporte.')).toBeInTheDocument();
    });
  });
});
