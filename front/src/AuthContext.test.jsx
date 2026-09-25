import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';
import { jsonResponse, mockFetch } from './test/renderWithProviders';

let auth;
const Probe = () => {
  auth = useAuth();
  return (
    <div>
      <span data-testid="user">{auth.user ? auth.user.name : 'anon'}</span>
      <span data-testid="loading">{String(auth.loading)}</span>
    </div>
  );
};

const renderProbe = () =>
  render(
    <AuthProvider>
      <Probe />
    </AuthProvider>,
  );

afterEach(() => vi.unstubAllGlobals());

describe('AuthContext', () => {
  it('useAuth fuera del provider lanza un error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/AuthProvider/);
  });

  it('sin token queda como anónimo y sin cargar', async () => {
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
    expect(screen.getByTestId('user')).toHaveTextContent('anon');
  });

  it('con token guardado carga el perfil', async () => {
    localStorage.setItem('mp_token', 'tok');
    const fetchMock = mockFetch(() => jsonResponse({ id: 'u1', name: 'Ana Perez' }));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ana Perez'));
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/auth\/profile$/);
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok');
  });

  it('si el perfil falla cierra la sesión', async () => {
    localStorage.setItem('mp_token', 'vencido');
    mockFetch(() => jsonResponse({}, false, 401));
    renderProbe();
    await waitFor(() => expect(localStorage.getItem('mp_token')).toBeNull());
    expect(screen.getByTestId('user')).toHaveTextContent('anon');
  });

  it('si la red falla cierra la sesión', async () => {
    localStorage.setItem('mp_token', 'tok');
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch(() => Promise.reject(new Error('offline')));
    renderProbe();
    await waitFor(() => expect(localStorage.getItem('mp_token')).toBeNull());
  });

  describe('login', () => {
    it('guarda el token y el usuario', async () => {
      renderProbe();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
      mockFetch((url) =>
        String(url).endsWith('/auth/login')
          ? jsonResponse({ accessToken: 'abc', user: { id: 'u1', name: 'Luis' } })
          : jsonResponse({ id: 'u1', name: 'Luis' }),
      );
      let returned;
      await act(async () => {
        returned = await auth.login('l@x.co', 'clave');
      });
      expect(returned).toEqual({ id: 'u1', name: 'Luis' });
      expect(localStorage.getItem('mp_token')).toBe('abc');
      await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Luis'));
    });

    it('lanza el mensaje del API cuando falla (mensaje simple)', async () => {
      renderProbe();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
      mockFetch(() => jsonResponse({ message: 'Contraseña incorrecta' }, false, 401));
      await expect(auth.login('a@b.co', 'x')).rejects.toThrow('Contraseña incorrecta');
    });

    it('une los mensajes cuando el API devuelve una lista', async () => {
      renderProbe();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
      mockFetch(() => jsonResponse({ message: ['email inválido', 'clave corta'] }, false));
      await expect(auth.login('a', 'b')).rejects.toThrow('email inválido | clave corta');
    });

    it('usa el campo error o un mensaje por defecto', async () => {
      renderProbe();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
      mockFetch(() => jsonResponse({ error: 'Bad Request' }, false));
      await expect(auth.login('a', 'b')).rejects.toThrow('Bad Request');
      mockFetch(() => jsonResponse(null, false));
      await expect(auth.login('a', 'b')).rejects.toThrow('Error desconocido');
      mockFetch(() => jsonResponse({}, false));
      await expect(auth.login('a', 'b')).rejects.toThrow('Error desconocido');
    });
  });

  describe('register', () => {
    it('crea la cuenta con rol CLIENT y guarda la sesión', async () => {
      renderProbe();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
      const fetchMock = mockFetch((url) =>
        String(url).endsWith('/auth/register')
          ? jsonResponse({ accessToken: 'nuevo', user: { id: 'u2', name: 'Eva' } })
          : jsonResponse({ id: 'u2', name: 'Eva' }),
      );
      await act(async () => {
        await auth.register('Eva', 'e@x.co', '123456');
      });
      expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
        name: 'Eva',
        email: 'e@x.co',
        password: '123456',
        role: 'CLIENT',
      });
      expect(localStorage.getItem('mp_token')).toBe('nuevo');
    });

    it('propaga el error del API', async () => {
      renderProbe();
      await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'));
      mockFetch(() => jsonResponse({ message: 'Ya existe una cuenta' }, false, 409));
      await expect(auth.register('a', 'b', 'c')).rejects.toThrow('Ya existe una cuenta');
    });
  });

  it('logout borra token y usuario', async () => {
    localStorage.setItem('mp_token', 'tok');
    mockFetch(() => jsonResponse({ id: 'u1', name: 'Ana' }));
    renderProbe();
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ana'));
    act(() => auth.logout());
    expect(screen.getByTestId('user')).toHaveTextContent('anon');
    expect(localStorage.getItem('mp_token')).toBeNull();
  });

  describe('navegación', () => {
    it('navigateToLogin guarda la ruta de retorno y va a #login', () => {
      renderProbe();
      act(() => auth.navigateToLogin('#tienda'));
      expect(sessionStorage.getItem('mp_return_url')).toBe('#tienda');
      expect(window.location.hash).toBe('#login');
    });

    it('navigateToLogin usa el hash actual y no guarda #login', () => {
      renderProbe();
      window.location.hash = '#foro';
      act(() => auth.navigateToLogin());
      expect(sessionStorage.getItem('mp_return_url')).toBe('#foro');
      act(() => auth.navigateToLogin('#login'));
      expect(sessionStorage.getItem('mp_return_url')).toBe('#foro');
    });

    it('redirectAfterLogin vuelve a la ruta guardada o a #inicio', () => {
      renderProbe();
      sessionStorage.setItem('mp_return_url', '#tienda');
      act(() => auth.redirectAfterLogin());
      expect(window.location.hash).toBe('#tienda');
      expect(sessionStorage.getItem('mp_return_url')).toBeNull();
      act(() => auth.redirectAfterLogin());
      expect(window.location.hash).toBe('#inicio');
    });
  });
});
