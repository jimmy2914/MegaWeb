import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from './Login';
import { renderWithProviders, jsonResponse, mockFetch } from './test/renderWithProviders';

afterEach(() => vi.unstubAllGlobals());

const profile = { id: 'u1', name: 'Ana Perez', email: 'ana@x.co', role: 'CLIENT' };

describe('Login', () => {
  it('muestra el formulario de inicio de sesión por defecto', async () => {
    renderWithProviders(<Login />);
    expect(await screen.findByRole('heading', { name: 'INICIAR SESIÓN' })).toBeInTheDocument();
    expect(screen.getByLabelText('Correo Electrónico')).toBeInTheDocument();
    expect(screen.getByLabelText('Contraseña')).toBeInTheDocument();
  });

  it('inicia sesión y regresa a la ruta guardada', async () => {
    sessionStorage.setItem('mp_return_url', '#tienda');
    mockFetch((url) =>
      String(url).endsWith('/auth/login')
        ? jsonResponse({ accessToken: 'abc', user: profile })
        : jsonResponse(profile),
    );
    renderWithProviders(<Login />);
    await userEvent.type(await screen.findByLabelText('Correo Electrónico'), 'ana@x.co');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave123');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar a mi Cuenta' }));
    await waitFor(() => expect(localStorage.getItem('mp_token')).toBe('abc'));
    expect(window.location.hash).toBe('#tienda');
  });

  it('muestra el error del API si las credenciales son inválidas', async () => {
    mockFetch(() => jsonResponse({ message: 'Contraseña incorrecta' }, false, 401));
    renderWithProviders(<Login />);
    await userEvent.type(await screen.findByLabelText('Correo Electrónico'), 'ana@x.co');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'mala');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar a mi Cuenta' }));
    expect(await screen.findByText('Contraseña incorrecta')).toBeInTheDocument();
  });

  it('cambia a la pestaña de registro y limpia el error', async () => {
    mockFetch(() => jsonResponse({ message: 'Falló' }, false));
    renderWithProviders(<Login />);
    await userEvent.type(await screen.findByLabelText('Correo Electrónico'), 'a@b.co');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'x');
    await userEvent.click(screen.getByRole('button', { name: 'Ingresar a mi Cuenta' }));
    await screen.findByText('Falló');
    await userEvent.click(screen.getByRole('button', { name: 'Registrarse' }));
    expect(screen.queryByText('Falló')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nombre Completo')).toBeInTheDocument();
  });

  it('registra una cuenta nueva', async () => {
    const fetchMock = mockFetch((url) =>
      String(url).endsWith('/auth/register')
        ? jsonResponse({ accessToken: 'nuevo', user: profile })
        : jsonResponse(profile),
    );
    renderWithProviders(<Login />);
    await userEvent.click(await screen.findByRole('button', { name: 'Registrarse' }));
    await userEvent.type(screen.getByLabelText('Nombre Completo'), 'Ana Perez');
    await userEvent.type(screen.getByLabelText('Correo Electrónico'), 'ana@x.co');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave123');
    await userEvent.click(screen.getByRole('button', { name: 'Crear Cuenta' }));
    await waitFor(() => expect(localStorage.getItem('mp_token')).toBe('nuevo'));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ name: 'Ana Perez', role: 'CLIENT' });
  });

  it('muestra el error al registrarse', async () => {
    mockFetch(() => jsonResponse({ message: 'Ya existe una cuenta' }, false, 409));
    renderWithProviders(<Login />);
    await userEvent.click(await screen.findByRole('button', { name: 'Registrarse' }));
    await userEvent.type(screen.getByLabelText('Nombre Completo'), 'Ana');
    await userEvent.type(screen.getByLabelText('Correo Electrónico'), 'ana@x.co');
    await userEvent.type(screen.getByLabelText('Contraseña'), 'clave123');
    await userEvent.click(screen.getByRole('button', { name: 'Crear Cuenta' }));
    expect(await screen.findByText('Ya existe una cuenta')).toBeInTheDocument();
  });

  it('el botón "Volver" usa la etiqueta de la ruta de retorno', async () => {
    sessionStorage.setItem('mp_return_url', '#foro');
    renderWithProviders(<Login />);
    const back = await screen.findByRole('button', { name: /Volver a Comunidad/ });
    await userEvent.click(back);
    expect(window.location.hash).toBe('#foro');
  });

  it.each([
    ['#tienda', 'Tienda Solar'],
    ['#calculadora', 'Calculadora Solar'],
    ['#otra', 'Inicio'],
  ])('etiqueta de retorno para %s', async (hash, label) => {
    sessionStorage.setItem('mp_return_url', hash);
    renderWithProviders(<Login />);
    expect(await screen.findByRole('button', { name: new RegExp(`Volver a ${label}`) })).toBeInTheDocument();
  });

  describe('con sesión iniciada', () => {
    const loginAs = (user) => {
      localStorage.setItem('mp_token', 'tok');
      mockFetch(() => jsonResponse(user));
    };

    it('muestra el perfil del cliente y permite cerrar sesión', async () => {
      loginAs(profile);
      renderWithProviders(<Login />);
      expect(await screen.findByText('¡Hola, Ana Perez!')).toBeInTheDocument();
      expect(screen.getByText('ana@x.co')).toBeInTheDocument();
      expect(screen.getByText('Cliente')).toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'Cerrar Sesión' }));
      expect(await screen.findByRole('heading', { name: 'INICIAR SESIÓN' })).toBeInTheDocument();
      expect(localStorage.getItem('mp_token')).toBeNull();
    });

    it('muestra la etiqueta de administrador', async () => {
      loginAs({ ...profile, role: 'ADMIN' });
      renderWithProviders(<Login />);
      expect(await screen.findByText('Administrador')).toBeInTheDocument();
    });

    it('usa "U" como inicial si el usuario no tiene nombre', async () => {
      loginAs({ id: 'u2', email: 'x@y.co', role: 'CLIENT' });
      renderWithProviders(<Login />);
      expect(await screen.findByText('U')).toBeInTheDocument();
    });
  });
});
