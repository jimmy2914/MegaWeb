import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Tienda from './Tienda';
import { renderWithProviders, jsonResponse, mockFetch } from './test/renderWithProviders';

afterEach(() => vi.unstubAllGlobals());

const products = [
  { id: 'p1', name: 'Panel Solar 550W', description: 'Panel eficiente', price: 850000, currency: 'COP', category: 'PANEL', images: ['https://img.test/p1.png'], inventory: 45, featured: true },
  { id: 'p2', name: 'Inversor Híbrido', description: 'Inversor smart', price: 2450000, currency: 'COP', category: 'INVERTER', images: ['https://img.test/p2.png'], inventory: 3, featured: false },
  { id: 'p3', name: 'Batería LiFePO4', description: 'Batería de litio', price: 4800000, currency: 'COP', category: 'BATTERY', images: ['https://img.test/p3.png'], inventory: 0, featured: false },
];

const clientUser = { id: 'u1', name: 'Ana Perez', email: 'ana@x.co', role: 'CLIENT' };
const adminUser = { id: 'a1', name: 'Root Admin', email: 'root@x.co', role: 'ADMIN' };

// Enrutador de fetch: perfil, catálogo y escrituras de productos
const storeApi = ({ user, list = products, write } = {}) =>
  mockFetch((url, opts = {}) => {
    const u = String(url);
    if (u.endsWith('/auth/profile')) return user ? jsonResponse(user) : jsonResponse({}, false, 401);
    if (opts.method && opts.method !== 'GET') return write ? write(u, opts) : jsonResponse({ ok: true });
    return jsonResponse({ items: list });
  });

const login = () => localStorage.setItem('mp_token', 'tok');

const renderStore = async (opts) => {
  const api = storeApi(opts);
  if (opts?.user) login();
  const utils = renderWithProviders(<Tienda />);
  await screen.findByRole('heading', { name: 'Panel Solar 550W' });
  return { api, ...utils };
};

const addPanel = async () => {
  const card = screen.getByRole('heading', { name: 'Panel Solar 550W' }).closest('.tienda-card');
  await userEvent.click(within(card).getByRole('button', { name: /Añadir al Carrito/ }));
};

describe('Tienda: catálogo', () => {
  it('muestra los productos con precio y stock', async () => {
    await renderStore();
    expect(screen.getAllByRole('heading', { level: 3 }).map((h) => h.textContent)).toEqual(
      expect.arrayContaining(['Panel Solar 550W', 'Inversor Híbrido', 'Batería LiFePO4']),
    );
    expect(screen.getByText(/850\.000/)).toBeInTheDocument();
    expect(screen.getByText('Stock: 45 uds')).toBeInTheDocument();
    expect(screen.getByText('Stock: 3 uds')).toHaveClass('tienda-card-stock--low');
  });

  it('deshabilita "Agotado" cuando no hay inventario', async () => {
    await renderStore();
    expect(screen.getByRole('button', { name: 'Agotado' })).toBeDisabled();
  });

  it('muestra "Cargando" mientras llega el catálogo', () => {
    storeApi();
    renderWithProviders(<Tienda />);
    expect(screen.getByText(/Cargando catálogo/)).toBeInTheDocument();
  });

  it('filtra por categoría y avisa cuando no hay resultados', async () => {
    await renderStore({ list: [products[0]] });
    await userEvent.click(screen.getByRole('button', { name: 'Baterías' }));
    expect(screen.getByText(/No se encontraron productos/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Paneles Solares' }));
    expect(screen.getByRole('heading', { name: 'Panel Solar 550W' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Todos los Productos' }));
    expect(screen.getByRole('heading', { name: 'Panel Solar 550W' })).toBeInTheDocument();
  });

  it('si el catálogo falla muestra el estado vacío', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    mockFetch(() => Promise.reject(new Error('offline')));
    renderWithProviders(<Tienda />);
    expect(await screen.findByText(/No se encontraron productos/)).toBeInTheDocument();
  });

  it('invitado: invita a iniciar sesión', async () => {
    await renderStore();
    await userEvent.click(screen.getByRole('button', { name: /Iniciar Sesión/ }));
    expect(window.location.hash).toBe('#login');
    expect(sessionStorage.getItem('mp_return_url')).toBe('#tienda');
  });

  it('usuario: muestra su nombre de pila', async () => {
    await renderStore({ user: clientUser });
    expect(await screen.findByText(/Tu carrito está guardado/)).toBeInTheDocument();
    expect(screen.queryByText('＋ Nuevo Producto')).not.toBeInTheDocument();
  });
});

describe('Tienda: guía de compra', () => {
  it('abre y cierra la guía', async () => {
    await renderStore();
    await userEvent.click(screen.getByText('¿Cómo comprar?'));
    expect(screen.getByText('¿Cómo hacer tu pedido en MegaWeb?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Entendido/ }));
    expect(screen.queryByText('¿Cómo hacer tu pedido en MegaWeb?')).not.toBeInTheDocument();
  });

  it('se cierra con la X', async () => {
    await renderStore();
    await userEvent.click(screen.getByText('¿Cómo comprar?'));
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByText('¿Cómo hacer tu pedido en MegaWeb?')).not.toBeInTheDocument();
  });
});

describe('Tienda: carrito', () => {
  it('añadir abre el cajón con el producto y los totales', async () => {
    await renderStore();
    await addPanel();
    expect(screen.getByText('Tu Carrito')).toBeInTheDocument();
    const drawer = document.querySelector('.tienda-drawer');
    expect(within(drawer).getByRole('heading', { name: 'Panel Solar 550W' })).toBeInTheDocument();
    expect(within(drawer).getByText('Subtotal:').nextSibling).toHaveTextContent(/850\.000/);
    expect(within(drawer).getByText('IVA (19%):').nextSibling).toHaveTextContent(/161\.500/);
    expect(within(drawer).getByText('Envío:').nextSibling).toHaveTextContent(/50\.000/);
    expect(document.querySelector('.tienda-cart-badge')).toHaveTextContent('1');
  });

  it('el envío es gratis en compras grandes', async () => {
    await renderStore();
    const card = screen.getByRole('heading', { name: 'Inversor Híbrido' }).closest('.tienda-card');
    await userEvent.click(within(card).getByRole('button', { name: /Añadir al Carrito/ }));
    expect(screen.getByText('Gratis')).toBeInTheDocument();
  });

  it('ajusta cantidades, elimina y muestra el carrito vacío', async () => {
    await renderStore();
    await addPanel();
    const drawer = document.querySelector('.tienda-drawer');
    await userEvent.click(within(drawer).getByRole('button', { name: '+' }));
    expect(within(drawer).getByText('2')).toBeInTheDocument();
    await userEvent.click(within(drawer).getByRole('button', { name: '-' }));
    expect(within(drawer).getByText('1')).toBeInTheDocument();
    await userEvent.click(within(drawer).getByRole('button', { name: 'Eliminar' }));
    expect(screen.getByText('Tu carrito está vacío.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Ver Productos' }));
    expect(screen.queryByText('Tu Carrito')).not.toBeInTheDocument();
  });

  it('el cajón se cierra con la X o el fondo y se reabre con "Mi Carrito"', async () => {
    await renderStore();
    await addPanel();
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByText('Tu Carrito')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Mi Carrito/ }));
    expect(screen.getByText('Tu Carrito')).toBeInTheDocument();
    await userEvent.click(document.querySelector('.tienda-drawer-overlay'));
    expect(screen.queryByText('Tu Carrito')).not.toBeInTheDocument();
  });

  it('invitado: el cajón ofrece iniciar sesión', async () => {
    await renderStore();
    await addPanel();
    await userEvent.click(within(document.querySelector('.tienda-drawer')).getByRole('button', { name: 'Inicia sesión' }));
    expect(window.location.hash).toBe('#login');
    expect(screen.queryByText('Tu Carrito')).not.toBeInTheDocument();
  });
});

describe('Tienda: checkout por WhatsApp', () => {
  const openCheckout = async () => {
    await addPanel();
    await userEvent.click(screen.getByRole('button', { name: 'Proceder al Checkout' }));
  };

  const fillAddress = async () => {
    await userEvent.type(screen.getByPlaceholderText('Calle 123 # 45-67 Apto 101'), 'Calle 1 # 2-3');
    await userEvent.type(screen.getByPlaceholderText('Medellín'), 'Villavicencio');
    await userEvent.type(screen.getByPlaceholderText('Antioquia'), 'Meta');
    await userEvent.type(screen.getByPlaceholderText('3001234567'), '3001112233');
  };

  it('invitado: muestra la advertencia y puede ir a iniciar sesión', async () => {
    await renderStore();
    await openCheckout();
    expect(screen.getByText(/como invitado/)).toBeInTheDocument();
    await userEvent.click(within(document.querySelector('.tienda-checkout-guest-warning')).getByRole('button', { name: 'Inicia sesión' }));
    expect(window.location.hash).toBe('#login');
  });

  it('genera la factura con el enlace de WhatsApp y vacía el carrito', async () => {
    await renderStore({ user: clientUser });
    await openCheckout();
    expect(screen.getByText(/Comprando como:/)).toBeInTheDocument();
    await fillAddress();
    await userEvent.click(screen.getByRole('button', { name: /Generar Factura/ }));

    expect(screen.getByText('¡Factura Lista!')).toBeInTheDocument();
    const link = screen.getByRole('link', { name: /Enviar Pedido por WhatsApp/ });
    const href = link.getAttribute('href');
    expect(href).toMatch(/^https:\/\/wa\.me\/573126217709\?text=/);
    const text = decodeURIComponent(href.split('text=')[1]);
    expect(text).toContain('Panel Solar 550W x1');
    expect(text).toContain('Calle 1 # 2-3');
    expect(text).toContain('Villavicencio');
    expect(text).toContain('Ana Perez — ana@x.co');
    expect(document.querySelector('.tienda-order-tag code').textContent).toMatch(/^MP-/);

    link.addEventListener('click', (e) => e.preventDefault());
    await userEvent.click(link);
    await waitFor(() => expect(document.querySelector('.tienda-cart-badge')).toBeNull());
  });

  it('"Seguir Comprando" cierra el modal y vacía el carrito', async () => {
    await renderStore();
    await openCheckout();
    await fillAddress();
    await userEvent.click(screen.getByRole('button', { name: /Generar Factura/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Seguir Comprando' }));
    expect(screen.queryByText('¡Factura Lista!')).not.toBeInTheDocument();
    expect(document.querySelector('.tienda-cart-badge')).toBeNull();
  });

  it('el mensaje de un invitado no incluye datos de cliente', async () => {
    await renderStore();
    await openCheckout();
    await fillAddress();
    await userEvent.click(screen.getByRole('button', { name: /Generar Factura/ }));
    const href = screen.getByRole('link', { name: /Enviar Pedido/ }).getAttribute('href');
    expect(decodeURIComponent(href)).not.toContain('*CLIENTE:*');
  });

  it('recuerda la dirección de envío entre visitas', async () => {
    const first = await renderStore();
    await openCheckout();
    await fillAddress();
    first.unmount();

    await renderStore();
    await userEvent.click(screen.getByRole('button', { name: /Mi Carrito/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Proceder al Checkout' }));
    expect(screen.getByPlaceholderText('Medellín')).toHaveValue('Villavicencio');
    expect(screen.getByPlaceholderText('3001234567')).toHaveValue('3001112233');
  });

  it('ignora datos de checkout corruptos', async () => {
    localStorage.setItem('mp_checkout_guest', '{roto');
    await renderStore();
    await openCheckout();
    expect(screen.getByPlaceholderText('Medellín')).toHaveValue('');
  });

  it('se cierra con la X', async () => {
    await renderStore();
    await openCheckout();
    await userEvent.click(screen.getByRole('button', { name: '✕' }));
    expect(screen.queryByText('Finalizar Compra')).not.toBeInTheDocument();
  });
});

describe('Tienda: administración de productos', () => {
  it('el admin ve la barra y las acciones de cada tarjeta', async () => {
    await renderStore({ user: adminUser });
    expect(await screen.findByRole('button', { name: /Nuevo Producto/ })).toBeInTheDocument();
    expect(screen.getAllByTitle('Editar producto')).toHaveLength(3);
    expect(screen.getAllByTitle('Eliminar producto')).toHaveLength(3);
  });

  it('crea un producto con los datos del formulario', async () => {
    const { api } = await renderStore({ user: adminUser });
    await userEvent.click(await screen.findByRole('button', { name: /Nuevo Producto/ }));

    await userEvent.type(screen.getByPlaceholderText(/Panel Solar Monocristalino/), 'Kit nuevo');
    await userEvent.type(screen.getByPlaceholderText(/Descripción detallada/), 'Un kit');
    await userEvent.type(screen.getByPlaceholderText('850000'), '1200000');
    await userEvent.type(screen.getByPlaceholderText('50'), '7');
    await userEvent.type(screen.getByPlaceholderText('https://...'), 'https://img/x.png');
    await userEvent.selectOptions(screen.getByDisplayValue('COP — Peso Colombiano'), 'USD');
    await userEvent.selectOptions(screen.getByDisplayValue('Paneles Solares'), 'BATTERY');
    await userEvent.click(screen.getByLabelText(/producto destacado/));
    await userEvent.click(screen.getByRole('button', { name: 'Crear Producto' }));

    await waitFor(() => expect(screen.queryByRole('button', { name: 'Crear Producto' })).not.toBeInTheDocument());
    const [url, opts] = api.mock.calls.find(([, o]) => o?.method === 'POST');
    expect(url).toMatch(/\/products$/);
    expect(opts.headers.Authorization).toBe('Bearer tok');
    expect(JSON.parse(opts.body)).toEqual({
      name: 'Kit nuevo',
      description: 'Un kit',
      price: 1200000,
      currency: 'USD',
      category: 'BATTERY',
      images: ['https://img/x.png'],
      inventory: 7,
      featured: true,
    });
  });

  it('edita un producto existente con PUT', async () => {
    const { api } = await renderStore({ user: adminUser });
    await userEvent.click((await screen.findAllByTitle('Editar producto'))[0]);
    expect(screen.getByText('✏️ Editar Producto')).toBeInTheDocument();
    const name = screen.getByPlaceholderText(/Panel Solar Monocristalino/);
    expect(name).toHaveValue('Panel Solar 550W');
    await userEvent.clear(name);
    await userEvent.type(name, 'Panel Editado');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar Cambios' }));

    await waitFor(() => expect(api.mock.calls.some(([, o]) => o?.method === 'PUT')).toBe(true));
    const [url, opts] = api.mock.calls.find(([, o]) => o?.method === 'PUT');
    expect(url).toMatch(/\/products\/p1$/);
    expect(JSON.parse(opts.body).name).toBe('Panel Editado');
  });

  it('muestra el error del API al guardar y permite cancelar', async () => {
    await renderStore({ user: adminUser, write: () => jsonResponse({ message: 'price must be positive' }, false) });
    await userEvent.click(await screen.findByRole('button', { name: /Nuevo Producto/ }));
    await userEvent.type(screen.getByPlaceholderText(/Panel Solar Monocristalino/), 'X');
    await userEvent.type(screen.getByPlaceholderText(/Descripción detallada/), 'Y');
    await userEvent.type(screen.getByPlaceholderText('850000'), '1');
    await userEvent.type(screen.getByPlaceholderText('50'), '1');
    await userEvent.click(screen.getByRole('button', { name: 'Crear Producto' }));
    expect(await screen.findByText('price must be positive')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('price must be positive')).not.toBeInTheDocument();
  });

  it('cierra el modal de producto con la X y con el fondo', async () => {
    await renderStore({ user: adminUser });
    await userEvent.click(await screen.findByRole('button', { name: /Nuevo Producto/ }));
    await userEvent.click(document.querySelector('.tienda-product-modal-close'));
    expect(screen.queryByText('Nombre del Producto')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Nuevo Producto/ }));
    await userEvent.click(document.querySelector('.tienda-product-modal-overlay'));
    expect(screen.queryByText('Nombre del Producto')).not.toBeInTheDocument();
  });

  it('elimina un producto tras confirmar', async () => {
    const { api } = await renderStore({ user: adminUser });
    await userEvent.click((await screen.findAllByTitle('Eliminar producto'))[1]);
    expect(screen.getByText('¿Eliminar Producto?')).toBeInTheDocument();
    expect(screen.getByText(/Inversor Híbrido/, { selector: 'strong' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Sí, Eliminar' }));

    await waitFor(() => expect(screen.queryByText('¿Eliminar Producto?')).not.toBeInTheDocument());
    const [url, opts] = api.mock.calls.find(([, o]) => o?.method === 'DELETE');
    expect(url).toMatch(/\/products\/p2$/);
    expect(opts.headers.Authorization).toBe('Bearer tok');
  });

  it('avisa con alert si falla la eliminación', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    await renderStore({ user: adminUser, write: () => jsonResponse({}, false, 403) });
    await userEvent.click((await screen.findAllByTitle('Eliminar producto'))[0]);
    await userEvent.click(screen.getByRole('button', { name: 'Sí, Eliminar' }));
    await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Error al eliminar el producto'));
  });

  it('cancelar la eliminación cierra la confirmación', async () => {
    await renderStore({ user: adminUser });
    await userEvent.click((await screen.findAllByTitle('Eliminar producto'))[0]);
    await userEvent.click(within(document.querySelector('.tienda-confirm-box')).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByText('¿Eliminar Producto?')).not.toBeInTheDocument();
  });
});
