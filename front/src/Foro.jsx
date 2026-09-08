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

    // --- Cargar hilos al montar ---
    useEffect(() => {
        fetchThreads();
    }, []);

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
        } catch {
            setThreads([]);
        }
    };

    const fetchThread = async (id) => {
        try {
            const res = await fetch(`${API_URL}/forum/threads/${id}`);
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
                body: JSON.stringify({ title: newThreadTitle, content: newThreadContent })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(parseApiError(data));
            setShowNewThread(false);
            setNewThreadTitle('');
            setNewThreadContent('');
            fetchThreads();
        } catch (err) {
            alert(err.message);
        }
    };

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
