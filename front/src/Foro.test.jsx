import { describe, it, expect, vi, afterEach } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Foro from './Foro';
import { renderWithProviders, jsonResponse, mockFetch } from './test/renderWithProviders';

afterEach(() => vi.unstubAllGlobals());

const threads = [
  { id: 't1', title: 'Cómo dimensionar', content: 'Necesito ayuda con el banco de baterías', status: 'OPEN', approved: true, authorId: 'a1', createdAt: '2026-01-05T10:00:00Z', author: { name: 'Ana' } },
  { id: 't2', title: 'Hilo largo', content: 'x'.repeat(150), status: 'CLOSED', approved: true, authorId: 'a2', createdAt: null, author: null },
];
const posts = [
  { id: 'p1', content: 'Prueba con 4 baterías', approved: true, createdAt: '2026-01-06T10:00:00Z', author: { name: 'luis' } },
  { id: 'p2', content: 'Anónimo', approved: false, createdAt: '2026-01-06T11:00:00Z', author: null },
];

// Enrutador de fetch mínimo para el foro
const forumApi = ({
  threadList = threads,
  myThreadList = [],
  adminThreadList,
  postList = posts,
  profile = { id: 'u1', name: 'Ana Perez', role: 'CLIENT' },
  onPost,
  onPut,
} = {}) =>
  mockFetch((url, opts = {}) => {
    const u = String(url);
    if (u.endsWith('/auth/profile')) return jsonResponse(profile);
    if (opts.method === 'POST') return onPost ? onPost(u, opts) : jsonResponse({ id: 'nuevo' });
    if (opts.method === 'PUT') return onPut ? onPut(u, opts) : jsonResponse({});
    if (u.includes('/forum/admin/threads/') || u.includes('/forum/my-threads/') || /\/forum\/threads\/[^/]+$/.test(u)) {
      return jsonResponse({ posts: postList });
    }
    if (u.endsWith('/forum/admin/threads')) return jsonResponse({ threads: adminThreadList ?? threadList });
    if (u.endsWith('/forum/my-threads')) return jsonResponse({ threads: myThreadList });
    if (u.endsWith('/forum/threads')) return jsonResponse({ threads: threadList });
    return jsonResponse({});
  });

const loggedIn = () => localStorage.setItem('mp_token', 'tok');

describe('Foro', () => {
  it('lista los hilos con estado, autor y vista previa recortada', async () => {
    forumApi();
    renderWithProviders(<Foro />);
    expect(await screen.findByText('Cómo dimensionar')).toBeInTheDocument();
    expect(screen.getByText('Abierto')).toBeInTheDocument();
    expect(screen.getByText('Cerrado')).toBeInTheDocument();
    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Usuario')).toBeInTheDocument();
    expect(screen.getByText(`${'x'.repeat(120)}…`)).toBeInTheDocument();
    expect(screen.getAllByText('✓ Verificado').length).toBe(2);
  });

  it('un hilo pendiente de aprobación muestra su propio estado y no la insignia de verificado', async () => {
    forumApi({ threadList: [{ ...threads[0], approved: false }] });
    renderWithProviders(<Foro />);
    expect(await screen.findByText('Pendiente de aprobación')).toBeInTheDocument();
    expect(screen.queryByText('✓ Verificado')).not.toBeInTheDocument();
  });

  it('muestra el estado vacío con llamado a unirse cuando no hay hilos', async () => {
    forumApi({ threadList: [] });
    renderWithProviders(<Foro />);
    expect(await screen.findByText('Aún no hay publicaciones.')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Únete a la comunidad' }));
    expect(window.location.hash).toBe('#login');
    expect(sessionStorage.getItem('mp_return_url')).toBe('#foro');
  });

  it('si la carga falla deja la lista vacía', async () => {
    mockFetch(() => Promise.reject(new Error('offline')));
    renderWithProviders(<Foro />);
    expect(await screen.findByText('Aún no hay publicaciones.')).toBeInTheDocument();
  });

  it('invitado: los botones de acceso llevan al login', async () => {
    forumApi();
    renderWithProviders(<Foro />);
    await screen.findByText('Cómo dimensionar');
    await userEvent.click(screen.getByRole('button', { name: 'Registrarse' }));
    expect(window.location.hash).toBe('#login');
  });

  it('al elegir un hilo muestra su detalle y respuestas', async () => {
    forumApi();
    renderWithProviders(<Foro />);
    await userEvent.click(await screen.findByText('Cómo dimensionar'));
    expect(await screen.findByText('Respuestas (2)')).toBeInTheDocument();
    expect(screen.getByText('Prueba con 4 baterías')).toBeInTheDocument();
    expect(screen.getByText('L')).toBeInTheDocument(); // avatar
    expect(screen.getByText('U')).toBeInTheDocument(); // autor anónimo
    expect(screen.getByText(/debes/)).toBeInTheDocument(); // invitado no puede responder
  });

  it('muestra un aviso si el hilo no tiene respuestas y "Volver" cierra el detalle', async () => {
    forumApi({ postList: [] });
    renderWithProviders(<Foro />);
    await userEvent.click(await screen.findByText('Cómo dimensionar'));
    expect(await screen.findByText(/Aún no hay respuestas/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: '← Volver' }));
    expect(screen.queryByText(/Aún no hay respuestas/)).not.toBeInTheDocument();
  });

  it('si falla la carga de respuestas las deja vacías', async () => {
    mockFetch((url) => {
      const u = String(url);
      if (/\/forum\/threads\/[^/]+$/.test(u)) return Promise.reject(new Error('offline'));
      return jsonResponse({ threads });
    });
    renderWithProviders(<Foro />);
    await userEvent.click(await screen.findByText('Cómo dimensionar'));
    expect(await screen.findByText('Respuestas (0)')).toBeInTheDocument();
  });

  it('un hilo cerrado no permite responder', async () => {
    forumApi();
    renderWithProviders(<Foro />);
    await userEvent.click(await screen.findByText('Hilo largo'));
    expect(await screen.findByText('Este hilo está cerrado y no admite nuevas respuestas.')).toBeInTheDocument();
  });

  describe('usuario autenticado', () => {
    it('saluda, permite cerrar sesión y crear un hilo', async () => {
      loggedIn();
      const fetchMock = forumApi();
      renderWithProviders(<Foro />);
      expect(await screen.findByText('Ana Perez')).toBeInTheDocument();

      await userEvent.click(screen.getByRole('button', { name: '+ Nuevo hilo' }));
      await userEvent.type(screen.getByPlaceholderText('Título del hilo'), 'Nuevo tema');
      await userEvent.type(screen.getByPlaceholderText(/Describe tu pregunta/), 'Contenido del tema');
      await userEvent.click(screen.getByRole('button', { name: 'Publicar hilo' }));

      await waitFor(() => expect(screen.queryByText('Nuevo hilo')).not.toBeInTheDocument());
      expect(await screen.findByText(/pasará a revisión por un administrador/)).toBeInTheDocument();
      const post = fetchMock.mock.calls.find(([, o]) => o?.method === 'POST');
      expect(JSON.parse(post[1].body)).toEqual({ title: 'Nuevo tema', content: 'Contenido del tema', categoryId: 'general' });
      expect(post[1].headers.Authorization).toBe('Bearer tok');
    });

    it('cierra el modal al pulsar la X o el fondo', async () => {
      loggedIn();
      forumApi();
      renderWithProviders(<Foro />);
      await userEvent.click(await screen.findByRole('button', { name: '+ Nuevo hilo' }));
      await userEvent.click(screen.getByRole('button', { name: '✕' }));
      expect(screen.queryByRole('heading', { name: 'Nuevo hilo' })).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: '+ Nuevo hilo' }));
      await userEvent.click(document.querySelector('.foro-modal-overlay'));
      expect(screen.queryByRole('heading', { name: 'Nuevo hilo' })).not.toBeInTheDocument();
    });

    it('avisa con alert si el API rechaza el nuevo hilo', async () => {
      loggedIn();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      forumApi({ onPost: () => jsonResponse({ message: ['categoryId should not be empty'] }, false) });
      renderWithProviders(<Foro />);
      await userEvent.click(await screen.findByRole('button', { name: '+ Nuevo hilo' }));
      await userEvent.type(screen.getByPlaceholderText('Título del hilo'), 'T');
      await userEvent.type(screen.getByPlaceholderText(/Describe tu pregunta/), 'C');
      await userEvent.click(screen.getByRole('button', { name: 'Publicar hilo' }));
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('categoryId should not be empty'));
    });

    it('publica una respuesta y recarga el hilo', async () => {
      loggedIn();
      const fetchMock = forumApi();
      renderWithProviders(<Foro />);
      await userEvent.click(await screen.findByText('Cómo dimensionar'));
      const box = await screen.findByPlaceholderText('Escribe tu respuesta...');
      await userEvent.type(box, 'Mi respuesta');
      await userEvent.click(screen.getByRole('button', { name: 'Publicar respuesta' }));
      await waitFor(() => expect(box).toHaveValue(''));
      const post = fetchMock.mock.calls.find(([u, o]) => o?.method === 'POST' && String(u).endsWith('/t1/posts'));
      expect(JSON.parse(post[1].body)).toEqual({ content: 'Mi respuesta' });
    });

    it('avisa con alert si falla publicar la respuesta', async () => {
      loggedIn();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      forumApi({ onPost: () => jsonResponse({ message: 'Thread is closed' }, false) });
      renderWithProviders(<Foro />);
      await userEvent.click(await screen.findByText('Cómo dimensionar'));
      await userEvent.type(await screen.findByPlaceholderText('Escribe tu respuesta...'), 'x');
      await userEvent.click(screen.getByRole('button', { name: 'Publicar respuesta' }));
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('Thread is closed'));
    });

    it('ofrece publicar primero cuando no hay hilos', async () => {
      loggedIn();
      forumApi({ threadList: [] });
      renderWithProviders(<Foro />);
      await userEvent.click(await screen.findByRole('button', { name: 'Sé el primero en publicar' }));
      expect(screen.getByRole('heading', { name: 'Nuevo hilo' })).toBeInTheDocument();
    });

    it('cerrar sesión vuelve a los botones de acceso', async () => {
      loggedIn();
      forumApi();
      renderWithProviders(<Foro />);
      await userEvent.click(await screen.findByRole('button', { name: 'Cerrar sesión' }));
      const auth = await screen.findByRole('button', { name: 'Iniciar sesión' });
      expect(within(auth.parentElement).getByRole('button', { name: 'Registrarse' })).toBeInTheDocument();
    });
  });

  describe('administrador', () => {
    const adminProfile = { id: 'admin1', name: 'Root Admin', role: 'ADMIN' };
    const pendingThread = { ...threads[0], approved: false, author: { name: 'Carlos' } };

    it('ve el banner de moderación y la lista completa de hilos, incluidos los pendientes', async () => {
      loggedIn();
      forumApi({ profile: adminProfile, adminThreadList: [pendingThread] });
      renderWithProviders(<Foro />);
      expect(await screen.findByText('Vista de moderación: revisa y valida el contenido de la comunidad.')).toBeInTheDocument();
      expect(await screen.findByText('Pendiente de aprobación')).toBeInTheDocument();
    });

    it('aprueba un hilo pendiente desde la lista', async () => {
      loggedIn();
      const fetchMock = forumApi({ profile: adminProfile, adminThreadList: [pendingThread] });
      renderWithProviders(<Foro />);
      await userEvent.click(await screen.findByRole('button', { name: 'Aprobar hilo' }));
      const put = fetchMock.mock.calls.find(([u, o]) => o?.method === 'PUT' && String(u).endsWith('/threads/t1/approval'));
      expect(put).toBeTruthy();
      expect(JSON.parse(put[1].body)).toEqual({ approved: true });
      expect(put[1].headers.Authorization).toBe('Bearer tok');
    });

    it('cierra un hilo abierto desde la lista', async () => {
      loggedIn();
      const fetchMock = forumApi({ profile: adminProfile, adminThreadList: [{ ...threads[0], author: { name: 'Carlos' } }] });
      renderWithProviders(<Foro />);
      await userEvent.click(await screen.findByRole('button', { name: 'Cerrar hilo' }));
      const put = fetchMock.mock.calls.find(([u, o]) => o?.method === 'PUT' && String(u).endsWith('/threads/t1/status'));
      expect(JSON.parse(put[1].body)).toEqual({ status: 'CLOSED' });
    });

    it('aprueba una respuesta pendiente en el detalle del hilo', async () => {
      loggedIn();
      const fetchMock = forumApi({ profile: adminProfile, adminThreadList: [{ ...threads[0], author: { name: 'Carlos' } }] });
      renderWithProviders(<Foro />);
      await userEvent.click(await screen.findByText('Cómo dimensionar'));
      await screen.findByText('Prueba con 4 baterías');
      await userEvent.click(screen.getAllByRole('button', { name: 'Aprobar respuesta' })[0]);
      const put = fetchMock.mock.calls.find(([u, o]) => o?.method === 'PUT' && String(u).endsWith('/posts/p2/approval'));
      expect(put).toBeTruthy();
      expect(JSON.parse(put[1].body)).toEqual({ approved: true });
    });

    it('avisa con alert si la moderación falla', async () => {
      loggedIn();
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      forumApi({
        profile: adminProfile,
        adminThreadList: [pendingThread],
        onPut: () => jsonResponse({ message: 'No autorizado' }, false),
      });
      renderWithProviders(<Foro />);
      await userEvent.click(await screen.findByRole('button', { name: 'Aprobar hilo' }));
      await waitFor(() => expect(alertSpy).toHaveBeenCalledWith('No autorizado'));
    });
  });
});
