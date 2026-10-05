import { useState } from 'react';
import { useAuth } from './AuthContext';
import './Login.css';

function Login() {
    const { user, login, register, logout, redirectAfterLogin } = useAuth();

    const [activeTab, setActiveTab] = useState('login'); // 'login' | 'register'
    
    // Formulario login
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    
    // Formulario registro
    const [regName, setRegName] = useState('');
    const [regEmail, setRegEmail] = useState('');
    const [regPassword, setRegPassword] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLoginSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await login(loginEmail, loginPassword);
            setLoginEmail('');
            setLoginPassword('');
            redirectAfterLogin();
        } catch (err) {
            setError(err.message || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    const handleRegisterSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await register(regName, regEmail, regPassword);
            setRegName('');
            setRegEmail('');
            setRegPassword('');
            redirectAfterLogin();
        } catch (err) {
            setError(err.message || 'Error al registrarse');
        } finally {
            setLoading(false);
        }
    };

    const returnUrl = sessionStorage.getItem('mp_return_url') || '#inicio';
    const getReturnLabel = (hash) => {
        switch (hash) {
            case '#tienda': return 'Tienda Solar';
            case '#foro': return 'Comunidad';
            case '#calculadora': return 'Calculadora Solar';
            default: return 'Inicio';
        }
    };

    if (user) {
        return (
            <section id="login" className="auth-section">
                <div className="auth-header">
                    <h2>MI CUENTA</h2>
                    <p className="auth-subtitle">Gestiona tu perfil de la comunidad y tu acceso a MegaWeb.</p>
                </div>
                <div className="auth-card auth-logged-card">
                    <div className="auth-avatar">
                        {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <h3>¡Hola, {user.name}!</h3>
                    <p className="auth-user-email">{user.email}</p>
                    <span className="auth-role-tag">{user.role === 'ADMIN' ? 'Administrador' : 'Cliente'}</span>

                    <div className="auth-logged-actions">
                        <button className="auth-btn-primary" onClick={redirectAfterLogin}>
                            Volver a {getReturnLabel(returnUrl)}
                        </button>
                        <button className="auth-btn-secondary" onClick={logout}>
                            Cerrar Sesión
                        </button>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id="login" className="auth-section">
            <div className="auth-header">
                <h2>INICIAR SESIÓN</h2>
                <p className="auth-subtitle">
                    Ingresa a tu cuenta para guardar tu carrito, consultar tus pedidos y participar en la comunidad.
                </p>
            </div>

            <div className="auth-card">
                <div className="auth-tabs">
                    <button 
                        className={`auth-tab ${activeTab === 'login' ? 'auth-tab--active' : ''}`}
                        onClick={() => { setActiveTab('login'); setError(''); }}
                    >
                        Iniciar Sesión
                    </button>
                    <button 
                        className={`auth-tab ${activeTab === 'register' ? 'auth-tab--active' : ''}`}
                        onClick={() => { setActiveTab('register'); setError(''); }}
                    >
                        Registrarse
                    </button>
                </div>

                {error && <div className="auth-error-banner">{error}</div>}

                {activeTab === 'login' ? (
                    <form className="auth-form" onSubmit={handleLoginSubmit}>
                        <div className="auth-form-group">
                            <label htmlFor="login-email">Correo Electrónico</label>
                            <input 
                                id="login-email"
                                type="email" 
                                required
                                placeholder="tu@email.com"
                                value={loginEmail}
                                onChange={(e) => setLoginEmail(e.target.value)}
                            />
                        </div>

                        <div className="auth-form-group">
                            <label htmlFor="login-password">Contraseña</label>
                            <input 
                                id="login-password"
                                type="password" 
                                required
                                placeholder="••••••••"
                                value={loginPassword}
                                onChange={(e) => setLoginPassword(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="auth-btn-primary auth-btn-full" disabled={loading}>
                            {loading ? 'Cargando...' : 'Ingresar a mi Cuenta'}
                        </button>
                    </form>
                ) : (
                    <form className="auth-form" onSubmit={handleRegisterSubmit}>
                        <div className="auth-form-group">
                            <label htmlFor="reg-name">Nombre Completo</label>
                            <input 
                                id="reg-name"
                                type="text" 
                                required
                                placeholder="Juan Pérez"
                                value={regName}
                                onChange={(e) => setRegName(e.target.value)}
                            />
                        </div>

                        <div className="auth-form-group">
                            <label htmlFor="reg-email">Correo Electrónico</label>
                            <input 
                                id="reg-email"
                                type="email" 
                                required
                                placeholder="tu@email.com"
                                value={regEmail}
                                onChange={(e) => setRegEmail(e.target.value)}
                            />
                        </div>

                        <div className="auth-form-group">
                            <label htmlFor="reg-password">Contraseña</label>
                            <input 
                                id="reg-password"
                                type="password" 
                                required
                                minLength={6}
                                placeholder="Mínimo 6 caracteres"
                                value={regPassword}
                                onChange={(e) => setRegPassword(e.target.value)}
                            />
                        </div>

                        <button type="submit" className="auth-btn-primary auth-btn-full" disabled={loading}>
                            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
                        </button>
                    </form>
                )}

                <div className="auth-footer-back">
                    <button type="button" className="auth-link-back" onClick={redirectAfterLogin}>
                        ← Volver a {getReturnLabel(returnUrl)}
                    </button>
                </div>
            </div>
        </section>
    );
}

export default Login;
