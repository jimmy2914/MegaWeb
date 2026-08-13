import React, { useState, useEffect } from 'react';
import './Foro.css';

const API_URL = 'http://localhost:3000/api/v1';

// Normaliza errores de NestJS: message puede ser string o array (ValidationPipe)
const parseApiError = (data) => {
    if (!data) return 'Error desconocido. Intenta de nuevo.';
    if (Array.isArray(data.message)) return data.message.join(' | ');
    return data.message || data.error || 'Error desconocido. Intenta de nuevo.';
};


function Foro() {
    // --- Estado de autenticación ---
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('mp_token') || null);

    // --- Estado del modal de login/registro ---
    const [showModal, setShowModal] = useState(false);
    const [modalTab, setModalTab] = useState('login'); // 'login' | 'register'

    // --- Formulario de login ---
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');

    // --- Formulario de registro ---
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');

    // --- Estado de hilos del foro ---
    const [threads, setThreads] = useState([]);
    const [selectedThread, setSelectedThread] = useState(null);
    const [threadPosts, setThreadPosts] = useState([]);

    // --- Nuevo hilo ---
    const [showNewThread, setShowNewThread] = useState(false);
    const [newThreadTitle, setNewThreadTitle] = useState('');
    const [newThreadContent, setNewThreadContent] = useState('');

    // --- Nueva respuesta ---
    const [newPostContent, setNewPostContent] = useState('');

    // --- Mensajes de error/éxito ---
    const [authError, setAuthError] = useState('');
    const [authLoading, setAuthLoading] = useState(false);

    // --- Cargar hilos al montar ---
    useEffect(() => {
        fetchThreads();
    }, []);

    // --- Cargar perfil si hay token ---
    useEffect(() => {
        if (token) {
            fetchProfile();
        }
    }, [token]);

    // --- Cargar posts al seleccionar un hilo ---
    useEffect(() => {
        if (selectedThread) {
            fetchThread(selectedThread.id);
        }
    }, [selectedThread]);

    const fetchThreads = async () => {
        try {
            const res = await fetch(`${API_URL}/forum/threads`);
            const data = await res.json();
            setThreads(data.threads || []);
        } catch (e) {
            setThreads([]);
        }
    };

    const fetchThread = async (id) => {
        try {
            const res = await fetch(`${API_URL}/forum/threads/${id}`);
            const data = await res.json();
            setThreadPosts(data.posts || []);
        } catch (e) {
            setThreadPosts([]);
        }
    };

    const fetchProfile = async () => {
        try {
            const res = await fetch(`${API_URL}/auth/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else {
                handleLogout();
            }
        } catch (e) {
            handleLogout();
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: loginEmail, password: loginPassword })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseApiError(data));
            localStorage.setItem('mp_token', data.accessToken);
            setToken(data.accessToken);
            setUser(data.user);
            setShowModal(false);
            setLoginEmail('');
            setLoginPassword('');
        } catch (err) {
            setAuthError(err.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setAuthError('');
        setAuthLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: regName, email: regEmail, password: regPassword, role: 'CLIENT' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseApiError(data));
            localStorage.setItem('mp_token', data.accessToken);
            setToken(data.accessToken);
            setUser(data.user);
            setShowModal(false);
            setRegName('');
            setRegEmail('');
            setRegPassword('');
        } catch (err) {
            setAuthError(err.message);
        } finally {
            setAuthLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('mp_token');
        setToken(null);
        setUser(null);
        setSelectedThread(null);
    };

    const handleCreateThread = async (e) => {
        e.preventDefault();
        if (!token) { setShowModal(true); return; }
        try {
            const res = await fetch(`${API_URL}/forum/threads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ title: newThreadTitle, content: newThreadContent, categoryId: 'general' })
            });
            if (!res.ok) throw new Error('Error al crear el hilo');
            setNewThreadTitle('');
            setNewThreadContent('');
            setShowNewThread(false);
            fetchThreads();
        } catch (err) {
            alert(err.message);
        }
    };

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!token) { setShowModal(true); return; }
        try {
            const res = await fetch(`${API_URL}/forum/threads/${selectedThread.id}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content: newPostContent })
            });
            if (!res.ok) throw new Error('Error al publicar');
            setNewPostContent('');
            fetchThread(selectedThread.id);
        } catch (err) {
            alert(err.message);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    const openModal = (tab) => {
        setAuthError('');
        setModalTab(tab);
        setShowModal(true);
    };

    return (
        <section id="foro" className="foro-section">
            {/* Encabezado de la sección */}
            <div className="foro-header">
                <h2>Comunidad</h2>
                <p className="foro-subtitle">
                    Comparte experiencias, resuelve dudas y conecta con nuestra comunidad de expertos en energía e infraestructura.
                </p>
                <div className="foro-header-actions">
                    {user ? (
                        <div className="foro-user-info">
                            <span className="foro-user-name">Hola, <strong>{user.name}</strong></span>
                            <button className="foro-btn-secondary" onClick={handleLogout}>Cerrar sesión</button>
                            <button className="foro-btn-primary" onClick={() => setShowNewThread(true)}>
                                + Nuevo hilo
                            </button>
                        </div>
                    ) : (
                        <div className="foro-auth-buttons">
                            <button className="foro-btn-secondary" onClick={() => openModal('login')}>Iniciar sesión</button>
                            <button className="foro-btn-primary" onClick={() => openModal('register')}>Registrarse</button>
                        </div>
                    )}
                </div>
            </div>

            {/* Cuerpo del foro */}
            <div className="foro-body">
                {/* Lista de hilos */}
                <div className={`foro-threads-panel ${selectedThread ? 'foro-threads-panel--narrow' : ''}`}>
                    {threads.length === 0 ? (
                        <div className="foro-empty">
                            <div className="foro-empty-icon">💬</div>
                            <p>Aún no hay publicaciones.</p>
                            {user ? (
                                <button className="foro-btn-primary" onClick={() => setShowNewThread(true)}>
                                    Sé el primero en publicar
                                </button>
                            ) : (
                                <button className="foro-btn-primary" onClick={() => openModal('register')}>
                                    Únete a la comunidad
                                </button>
                            )}
                        </div>
                    ) : (
                        threads.map(thread => (
                            <div
                                key={thread.id}
                                className={`foro-thread-card ${selectedThread?.id === thread.id ? 'foro-thread-card--active' : ''}`}
                                onClick={() => setSelectedThread(thread)}
                            >
                                <div className="foro-thread-card-top">
                                    <span className={`foro-thread-status foro-thread-status--${(thread.status || 'OPEN').toLowerCase()}`}>
                                        {thread.status === 'CLOSED' ? 'Cerrado' : 'Abierto'}
                                    </span>
                                    <span className="foro-thread-date">{formatDate(thread.createdAt)}</span>
                                </div>
                                <h3 className="foro-thread-title">{thread.title}</h3>
                                <p className="foro-thread-preview">{thread.content?.substring(0, 120)}{thread.content?.length > 120 ? '…' : ''}</p>
                                <div className="foro-thread-card-bottom">
                                    <span className="foro-thread-author">Por: <strong>{thread.author?.name || 'Usuario'}</strong></span>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Detalle del hilo seleccionado */}
                {selectedThread && (
                    <div className="foro-detail-panel">
                        <button className="foro-back-btn" onClick={() => { setSelectedThread(null); setThreadPosts([]); }}>
                            ← Volver
                        </button>
                        <h3 className="foro-detail-title">{selectedThread.title}</h3>
                        <div className="foro-detail-original">
                            <p>{selectedThread.content}</p>
                            <div className="foro-detail-meta">
                                <span className="foro-detail-author">Por <strong>{selectedThread.author?.name || 'Usuario'}</strong></span>
                                <span className="foro-detail-date">{formatDate(selectedThread.createdAt)}</span>
                            </div>
                        </div>

                        <div className="foro-posts-list">
                            <h4 className="foro-posts-heading">Respuestas ({threadPosts.length})</h4>
                            {threadPosts.length === 0 ? (
                                <p className="foro-no-posts">Aún no hay respuestas. ¡Sé el primero!</p>
                            ) : (
                                threadPosts.map(post => (
                                    <div key={post.id} className="foro-post-item">
                                        <div className="foro-post-avatar">
                                            {post.author?.name?.charAt(0)?.toUpperCase() || 'U'}
                                        </div>
                                        <div className="foro-post-body">
                                            <div className="foro-post-header">
                                                <span className="foro-post-author-name">{post.author?.name || 'Usuario'}</span>
                                                <span className="foro-post-date">{formatDate(post.createdAt)}</span>
                                            </div>
                                            <p className="foro-post-content">{post.content}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Formulario de nueva respuesta */}
                        {user ? (
                            <form className="foro-reply-form" onSubmit={handleCreatePost}>
                                <textarea
                                    className="foro-textarea"
                                    placeholder="Escribe tu respuesta..."
                                    value={newPostContent}
                                    onChange={e => setNewPostContent(e.target.value)}
                                    required
                                    rows={3}
                                />
                                <button type="submit" className="foro-btn-primary">Publicar respuesta</button>
                            </form>
                        ) : (
                            <div className="foro-login-prompt">
                                <p>Para responder, debes <button className="foro-link-btn" onClick={() => openModal('login')}>iniciar sesión</button> o <button className="foro-link-btn" onClick={() => openModal('register')}>registrarte</button>.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Modal nuevo hilo */}
            {showNewThread && (
                <div className="foro-modal-overlay" onClick={() => setShowNewThread(false)}>
                    <div className="foro-modal" onClick={e => e.stopPropagation()}>
                        <button className="foro-modal-close" onClick={() => setShowNewThread(false)}>✕</button>
                        <h3 className="foro-modal-title">Nuevo hilo</h3>
                        <form onSubmit={handleCreateThread} className="foro-modal-form">
                            <label className="foro-label">Título</label>
                            <input
                                className="foro-input"
                                type="text"
                                placeholder="Título del hilo"
                                value={newThreadTitle}
                                onChange={e => setNewThreadTitle(e.target.value)}
                                required
                            />
                            <label className="foro-label">Contenido</label>
                            <textarea
                                className="foro-textarea"
                                placeholder="Describe tu pregunta o tema..."
                                value={newThreadContent}
                                onChange={e => setNewThreadContent(e.target.value)}
                                required
                                rows={5}
                            />
                            <button type="submit" className="foro-btn-primary foro-btn-full">Publicar hilo</button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal login/registro */}
            {showModal && (
                <div className="foro-modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="foro-modal" onClick={e => e.stopPropagation()}>
                        <button className="foro-modal-close" onClick={() => setShowModal(false)}>✕</button>

                        {/* Pestañas */}
                        <div className="foro-modal-tabs">
                            <button
                                className={`foro-tab ${modalTab === 'login' ? 'foro-tab--active' : ''}`}
                                onClick={() => { setModalTab('login'); setAuthError(''); }}
                            >
                                Iniciar sesión
                            </button>
                            <button
                                className={`foro-tab ${modalTab === 'register' ? 'foro-tab--active' : ''}`}
                                onClick={() => { setModalTab('register'); setAuthError(''); }}
                            >
                                Registrarse
                            </button>
                        </div>

                        {authError && <p className="foro-auth-error">{authError}</p>}

                        {/* Formulario login */}
                        {modalTab === 'login' && (
                            <form className="foro-modal-form" onSubmit={handleLogin}>
                                <label className="foro-label">Correo electrónico</label>
                                <input
                                    className="foro-input"
                                    type="email"
                                    placeholder="correo@ejemplo.com"
                                    value={loginEmail}
                                    onChange={e => setLoginEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                                <label className="foro-label">Contraseña</label>
                                <input
                                    className="foro-input"
                                    type="password"
                                    placeholder="••••••••"
                                    value={loginPassword}
                                    onChange={e => setLoginPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                />
                                <button
                                    type="submit"
                                    className="foro-btn-primary foro-btn-full"
                                    disabled={authLoading}
                                >
                                    {authLoading ? 'Ingresando...' : 'Iniciar sesión'}
                                </button>
                                <p className="foro-modal-switch">
                                    ¿No tienes cuenta?{' '}
                                    <button type="button" className="foro-link-btn" onClick={() => { setModalTab('register'); setAuthError(''); }}>
                                        Regístrate
                                    </button>
                                </p>
                            </form>
                        )}

                        {/* Formulario registro */}
                        {modalTab === 'register' && (
                            <form className="foro-modal-form" onSubmit={handleRegister}>
                                <label className="foro-label">Nombre completo</label>
                                <input
                                    className="foro-input"
                                    type="text"
                                    placeholder="Tu nombre"
                                    value={regName}
                                    onChange={e => setRegName(e.target.value)}
                                    required
                                    autoComplete="name"
                                />
                                <label className="foro-label">Correo electrónico</label>
                                <input
                                    className="foro-input"
                                    type="email"
                                    placeholder="correo@ejemplo.com"
                                    value={regEmail}
                                    onChange={e => setRegEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                />
                                <label className="foro-label">Contraseña</label>
                                <input
                                    className="foro-input"
                                    type="password"
                                    placeholder="Mínimo 8 caracteres"
                                    value={regPassword}
                                    onChange={e => setRegPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    autoComplete="new-password"
                                />
                                <button
                                    type="submit"
                                    className="foro-btn-primary foro-btn-full"
                                    disabled={authLoading}
                                >
                                    {authLoading ? 'Creando cuenta...' : 'Crear cuenta'}
                                </button>
                                <p className="foro-modal-switch">
                                    ¿Ya tienes cuenta?{' '}
                                    <button type="button" className="foro-link-btn" onClick={() => { setModalTab('login'); setAuthError(''); }}>
                                        Inicia sesión
                                    </button>
                                </p>
                            </form>
                        )}
                    </div>
                </div>
            )}
        </section>
    );
}

export default Foro;
