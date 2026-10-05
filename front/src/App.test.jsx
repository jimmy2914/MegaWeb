import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, waitFor } from '@testing-library/react';
import App from './App';
import { jsonResponse, mockFetch } from './test/renderWithProviders';

vi.mock('react-ga', () => ({ default: { pageview: vi.fn(), initialize: vi.fn() } }));

import ReactGA from 'react-ga';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  document.cookie = 'cookieConsent=; max-age=0; path=/';
});

const goTo = async (hash) => {
  await act(async () => {
    window.location.hash = hash;
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  });
};

const mockApi = ({ admin = false } = {}) =>
  mockFetch((url) => {
    const u = String(url);
    if (u.endsWith('/auth/profile')) {
      return admin ? jsonResponse({ id: 'a1', name: 'Root Admin', role: 'ADMIN' }) : jsonResponse({}, false, 401);
    }
    if (u.endsWith('/products')) return jsonResponse({ items: [] });
    if (u.endsWith('/forum/threads')) return jsonResponse({ threads: [] });
    return jsonResponse({}, false, 401);
  });

describe('App', () => {
  it('muestra la página de inicio con todas sus secciones', async () => {
    mockApi();
    render(<App />);
    expect(await screen.findByRole('heading', { name: 'SERVICIOS' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nosotros' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'PROYECTOS' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Nuestras Experiencias' })).toBeInTheDocument();
    expect(screen.getByText(/Utilizamos cookies/)).toBeInTheDocument();
    expect(screen.getByAltText('WhatsApp')).toBeInTheDocument();
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it.each([
    ['#tienda', 'TIENDA SOLAR'],
    ['#foro', 'Comunidad'],
    ['#login', 'INICIAR SESIÓN'],
    ['#iniciar-sesion', 'INICIAR SESIÓN'],
  ])('%s muestra su vista', async (hash, heading) => {
    mockApi();
    render(<App />);
    await goTo(hash);
    expect(await screen.findByRole('heading', { name: heading })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'SERVICIOS' })).not.toBeInTheDocument();
  });

  it('un usuario no administrador que visita #calculadora es redirigido a inicio', async () => {
    mockApi();
    render(<App />);
    await goTo('#calculadora');
    expect(await screen.findByRole('heading', { name: 'SERVICIOS' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Calculadora Solar' })).not.toBeInTheDocument();
  });

  it('un administrador puede ver la Calculadora Solar en #calculadora', async () => {
    localStorage.setItem('mp_token', 'tok');
    mockApi({ admin: true });
    render(<App />);
    await goTo('#calculadora');
    expect(await screen.findByRole('heading', { name: 'Calculadora Solar' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'SERVICIOS' })).not.toBeInTheDocument();
  });

  it('vuelve al inicio con #inicio y hace scroll a la sección pedida', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    mockApi();
    render(<App />);
    await goTo('#foro');
    await goTo('#servicio');
    expect(await screen.findByRole('heading', { name: 'SERVICIOS' })).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(150);
    });
    await waitFor(() => expect(Element.prototype.scrollIntoView).toHaveBeenCalled());
  });

  it('registra la vista en Google Analytics solo con consentimiento', async () => {
    mockApi();
    document.cookie = 'cookieConsent=true; path=/';
    render(<App />);
    await screen.findByRole('heading', { name: 'SERVICIOS' });
    expect(ReactGA.pageview).toHaveBeenCalled();
  });

  it('sin consentimiento no registra la vista', async () => {
    mockApi();
    render(<App />);
    await screen.findByRole('heading', { name: 'SERVICIOS' });
    expect(ReactGA.pageview).not.toHaveBeenCalled();
  });
});
