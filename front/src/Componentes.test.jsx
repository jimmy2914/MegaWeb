import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Inicio from './Inicio';
import Nosotros from './Nosotros';
import Servicios from './Servicios';
import Proyectos from './Proyectos';
import Clientes from './Clientes';
import Footer from './Footer';
import WhatsAppIcon from './WhatsAppIcon';
import CookieConsent from './CookieConsent';
import Nav from './Nav';
import { renderWithProviders, jsonResponse, mockFetch } from './test/renderWithProviders';

afterEach(() => vi.unstubAllGlobals());

describe('secciones estáticas', () => {
  it('Inicio muestra el lema y el enlace a servicios', () => {
    render(<Inicio />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/FUTURO SOSTENIBLE/);
    expect(screen.getByAltText('Flecha hacia abajo').closest('a')).toHaveAttribute('href', '#servicio');
  });

  it('Nosotros muestra la descripción de la empresa', () => {
    render(<Nosotros />);
    expect(screen.getByRole('heading', { name: 'Nosotros' })).toBeInTheDocument();
    expect(screen.getByText(/empresa comprometida/)).toBeInTheDocument();
  });

  it('Servicios lista las 4 categorías', () => {
    render(<Servicios />);
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual([
      'ENERGIA',
      'COMUNICACION INDUSTRIAL COMERCIAL',
      'SEGURIDAD ELECTRONICA',
      'DETECCIÓN Y EXTINCIÓN DE INCENDIO',
    ]);
  });

  it('Proyectos incrusta 2 videos', () => {
    render(<Proyectos />);
    expect(screen.getByTitle('Proyecto 1')).toHaveAttribute('src', expect.stringContaining('youtube.com/embed'));
    expect(screen.getByTitle('Proyecto 2')).toBeInTheDocument();
  });

  it('Clientes muestra 21 logos', () => {
    render(<Clientes />);
    expect(screen.getAllByAltText(/^Cliente \d+$/)).toHaveLength(21);
  });

  it('Footer tiene contacto, políticas y redes sociales', () => {
    render(<Footer />);
    expect(screen.getByLabelText('Phone')).toHaveAttribute('href', expect.stringContaining('tel:'));
    expect(screen.getByLabelText('Email')).toHaveAttribute('href', expect.stringContaining('mailto:'));
    expect(screen.getByText('Políticas de Privacidad')).toHaveAttribute('href', '/Politicas.pdf');
    ['LinkedIn', 'YouTube', 'Instagram', 'WhatsApp'].forEach((label) =>
      expect(screen.getByLabelText(label)).toHaveAttribute('target', '_blank'),
    );
  });

  it('WhatsAppIcon enlaza a wa.me', () => {
    render(<WhatsAppIcon />);
    expect(screen.getByAltText('WhatsApp').closest('a').getAttribute('href')).toContain('wa.me/3126217709');
  });
});

describe('CookieConsent', () => {
  it('muestra el aviso y lo oculta al aceptar guardando la cookie', async () => {
    render(<CookieConsent />);
    expect(screen.getByText(/Utilizamos cookies/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Aceptar' }));
    expect(screen.queryByText(/Utilizamos cookies/)).not.toBeInTheDocument();
    expect(document.cookie).toContain('cookieConsent=true');
  });
});

describe('Nav', () => {
  it('invitado: muestra "Iniciar Sesión" y guarda la ruta de retorno al pulsarlo', async () => {
    renderWithProviders(<Nav />);
    const login = await screen.findByText('Iniciar Sesión');
    window.location.hash = '#tienda';
    await userEvent.click(login);
    expect(sessionStorage.getItem('mp_return_url')).toBe('#tienda');
    expect(window.location.hash).toBe('#login');
  });

  it('usuario autenticado: muestra su primer nombre', async () => {
    localStorage.setItem('mp_token', 'tok');
    mockFetch(() => jsonResponse({ id: 'u1', name: 'Ana Maria Lopez', role: 'CLIENT' }));
    renderWithProviders(<Nav />);
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Iniciar Sesión')).not.toBeInTheDocument();
  });

  it('el menú hamburguesa abre y los enlaces lo cierran', async () => {
    const { container } = renderWithProviders(<Nav />);
    await screen.findByText('Iniciar Sesión');
    const list = container.querySelector('.nav-links');
    expect(list).not.toHaveClass('open');
    fireEvent.click(container.querySelector('.hamburger'));
    expect(list).toHaveClass('open');
    await userEvent.click(screen.getByText('Servicios'));
    expect(list).not.toHaveClass('open');
  });

  it('incluye los enlaces principales del sitio', async () => {
    renderWithProviders(<Nav />);
    await screen.findByText('Iniciar Sesión');
    ['Inicio', 'Servicios', 'Nosotros', 'Proyectos', 'Tienda', 'Comunidad', 'Correo', 'Soporte'].forEach((t) =>
      expect(screen.getByText(t)).toBeInTheDocument(),
    );
  });

  it('el enlace a Calculadora solo aparece para administradores', async () => {
    renderWithProviders(<Nav />);
    await screen.findByText('Iniciar Sesión');
    expect(screen.queryByText('Calculadora')).not.toBeInTheDocument();
  });

  it('administrador autenticado: ve el enlace a Calculadora', async () => {
    localStorage.setItem('mp_token', 'tok');
    mockFetch(() => jsonResponse({ id: 'u1', name: 'Root Admin', role: 'ADMIN' }));
    renderWithProviders(<Nav />);
    expect(await screen.findByText('Calculadora')).toBeInTheDocument();
  });
});
