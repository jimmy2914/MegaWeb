import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import './Foro.css';

const API_URL = 'http://localhost:3000/api/v1';

const parseApiError = (data) => {
    if (!data) return 'Error desconocido. Intenta de nuevo.';
    if (Array.isArray(data.message)) return data.message.join(' | ');
    return data.message || data.error || 'Error desconocido. Intenta de nuevo.';
};

function Foro() {
    const { user, token, logout, navigateToLogin } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    // --- Estado de hilos del foro ---
    const [threads, setThreads] = useState([]);
    const [selectedThread, setSelectedThread] = useState(null);
    const [threadPosts, setThreadPosts] = useState([]);

    // --- Nuevo hilo ---
    const [showNewThread, setShowNewThread] = useState(false);
    const [newThreadTitle, setNewThreadTitle] = useState('');
    const [newThreadContent, setNewThreadContent] = useState('');
    const [threadNotice, setThreadNotice] = useState('');

    // --- Nueva respuesta ---
    const [newPostContent, setNewPostContent] = useState('');

    // --- Cargar hilos al montar ---
    useEffect(() => {
        fetchThreads();
    }, [isAdmin]);

    // --- Cargar posts al seleccionar un hilo ---
    useEffect(() => {
        if (selectedThread) {
            fetchThread(selectedThread.id);
        }
    }, [selectedThread, isAdmin]);

    const fetchThreads = async () => {
        try {
            const publicRequest = fetch(`${API_URL}/forum/threads`);
            if (isAdmin) {
                const res = await fetch(`${API_URL}/forum/admin/threads`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                setThreads(data.threads || []);
                return;
            }
            const requests = [publicRequest];
            if (token) {
                requests.push(fetch(`${API_URL}/forum/my-threads`, {
                    headers: { Authorization: `Bearer ${token}` }
                }));
            }
            const responses = await Promise.all(requests);
            const lists = await Promise.all(responses.map(response => response.json()));
            const merged = [...(lists[0].threads || []), ...(lists[1]?.threads || [])];
            setThreads(Array.from(new Map(merged.map(thread => [thread.id, thread])).values()));
        } catch {
            setThreads([]);
        }
    };

    const fetchThread = async (id) => {
        try {
            const isOwnThread = selectedThread?.authorId === user?.id;
            const endpoint = isAdmin
                ? `/forum/admin/threads/${id}`
                : isOwnThread
                    ? `/forum/my-threads/${id}`
                    : `/forum/threads/${id}`;
            const res = await fetch(`${API_URL}${endpoint}`, {
                headers: isAdmin || isOwnThread ? { Authorization: `Bearer ${token}` } : undefined
            });
            const data = await res.json();
            setThreadPosts(data.posts || []);
        } catch {
            setThreadPosts([]);
        }
    };

    const handleCreateThread = async (e) => {
        e.preventDefault();
        if (!token) return;
        try {
            const res = await fetch(`${API_URL}/forum/threads`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ title: newThreadTitle, content: newThreadContent, categoryId: 'general' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseApiError(data));
            setShowNewThread(false);
            setNewThreadTitle('');
            setNewThreadContent('');
            setThreadNotice('Tu hilo fue publicado y pasará a revisión por un administrador antes de ser aprobado.');
            await fetchThreads();
            setSelectedThread(data);
        } catch (err) {
            alert(err.message);
        }
    };

    const moderate = async (path, body) => {
        try {
            const res = await fetch(`${API_URL}${path}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify(body)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseApiError(data));
            await fetchThreads();
            if (selectedThread) await fetchThread(selectedThread.id);
        } catch (err) {
            alert(err.message);
        }
    };

    const toggleThreadStatus = (thread) => moderate(
        `/forum/threads/${thread.id}/status`,
        { status: thread.status === 'CLOSED' ? 'OPEN' : 'CLOSED' }
    );

    const toggleThreadApproval = (thread) => moderate(
        `/forum/threads/${thread.id}/approval`,
        { approved: !thread.approved }
    );

    const togglePostApproval = (post) => moderate(
        `/forum/posts/${post.id}/approval`,
        { approved: !post.approved }
    );

    const handleCreatePost = async (e) => {
        e.preventDefault();
        if (!token || !selectedThread) return;
        try {
            const res = await fetch(`${API_URL}/forum/threads/${selectedThread.id}/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({ content: newPostContent })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseApiError(data));
            setNewPostContent('');
            fetchThread(selectedThread.id);
        } catch (err) {
            alert(err.message);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('es-CO', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <section id="foro" className="foro-section">
            {/* Encabezado */}
            <div className="foro-header">
                <h2>Comunidad</h2>
                <p className="foro-subtitle">
                    Comparte experiencias, resuelve dudas y conecta con nuestra comunidad de expertos en energía e infraestructura.
                </p>
                <div className="foro-header-actions">
                    {user ? (
                        <div className="foro-user-info">
                            <span className="foro-user-name">Hola, <strong>{user.name}</strong></span>
                            <button className="foro-btn-secondary" onClick={logout}>Cerrar sesión</button>
                            <button className="foro-btn-primary" onClick={() => setShowNewThread(true)}>
                                + Nuevo hilo
                            </button>
                        </div>
                    ) : (
                        <div className="foro-auth-buttons">
                            <button className="foro-btn-secondary" onClick={() => navigateToLogin('#foro')}>Iniciar sesión</button>
                            <button className="foro-btn-primary" onClick={() => navigateToLogin('#foro')}>Registrarse</button>
                        </div>
                    )}
                </div>
                {isAdmin && <div className="foro-admin-banner">Vista de moderación: revisa y valida el contenido de la comunidad.</div>}
                {threadNotice && <div className="foro-review-notice">{threadNotice}</div>}
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
                                <button className="foro-btn-primary" onClick={() => navigateToLogin('#foro')}>
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
                                    <div className="foro-thread-badges">
                                        <span className={`foro-thread-status foro-thread-status--${!thread.approved ? 'pending' : (thread.status || 'OPEN').toLowerCase()}`}>
                                            {!thread.approved ? 'Pendiente de aprobación' : thread.status === 'CLOSED' ? 'Cerrado' : 'Abierto'}
                                        </span>
                                        {thread.approved && <span className="foro-verified-badge">✓ Verificado</span>}
                                    </div>
                                    <span className="foro-thread-date">{formatDate(thread.createdAt)}</span>
                                </div>
                                <h3 className="foro-thread-title">{thread.title}</h3>
                                <p className="foro-thread-preview">{thread.content?.substring(0, 120)}{thread.content?.length > 120 ? '…' : ''}</p>
                                <div className="foro-thread-card-bottom">
                                    <span className="foro-thread-author">Por: <strong>{thread.author?.name || 'Usuario'}</strong></span>
                                    {isAdmin && <div className="foro-moderation-actions" onClick={e => e.stopPropagation()}>
                                        <button className="foro-moderation-btn" onClick={() => toggleThreadApproval(thread)}>
                                            {thread.approved ? 'Quitar aprobación' : 'Aprobar hilo'}
                                        </button>
                                        <button className="foro-moderation-btn" onClick={() => toggleThreadStatus(thread)}>
                                            {thread.status === 'CLOSED' ? 'Abrir hilo' : 'Cerrar hilo'}
                                        </button>
                                    </div>}
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
                        <div className="foro-detail-heading">
                            <h3 className="foro-detail-title">{selectedThread.title}</h3>
                            {selectedThread.approved && <span className="foro-verified-badge">✓ Verificado</span>}
                        </div>
                        {isAdmin && <div className="foro-moderation-actions">
                            <button className="foro-moderation-btn" onClick={() => toggleThreadApproval(selectedThread)}>
                                {selectedThread.approved ? 'Quitar aprobación del hilo' : 'Aprobar hilo'}
                            </button>
                            <button className="foro-moderation-btn" onClick={() => toggleThreadStatus(selectedThread)}>
                                {selectedThread.status === 'CLOSED' ? 'Abrir hilo' : 'Cerrar hilo'}
                            </button>
                        </div>}
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
                                                <span className="foro-post-author-name">{post.author?.name || 'Usuario'} {post.approved && <span className="foro-verified-badge">✓</span>}</span>
                                                <span className="foro-post-date">{formatDate(post.createdAt)}</span>
                                            </div>
                                            <p className="foro-post-content">{post.content}</p>
                                            {isAdmin && <button className="foro-moderation-btn" onClick={() => togglePostApproval(post)}>
                                                {post.approved ? 'Quitar aprobación' : 'Aprobar respuesta'}
                                            </button>}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Formulario de nueva respuesta */}
                        {selectedThread.status === 'CLOSED' ? (
                            <p className="foro-no-posts">Este hilo está cerrado y no admite nuevas respuestas.</p>
                        ) : user ? (
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
                                <p>Para responder, debes <button className="foro-link-btn" onClick={() => navigateToLogin('#foro')}>iniciar sesión</button> o <button className="foro-link-btn" onClick={() => navigateToLogin('#foro')}>registrarte</button>.</p>
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
        </section>
    );
}

export default Foro;
