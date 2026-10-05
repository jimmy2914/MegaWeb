/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const API_URL = 'http://localhost:3000/api/v1';

const AuthContext = createContext(null);

const parseApiError = (data) => {
    if (!data) return 'Error desconocido. Intenta de nuevo.';
    if (Array.isArray(data.message)) return data.message.join(' | ');
    return data.message || data.error || 'Error desconocido. Intenta de nuevo.';
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('mp_token') || null);
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('mp_token');
        setToken(null);
        setUser(null);
    }, []);

    const fetchProfile = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/auth/profile`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
            } else {
                logout();
            }
        } catch (e) {
            console.error('Error al cargar perfil:', e);
            logout();
        } finally {
            setLoading(false);
        }
    }, [token, logout]);

    useEffect(() => {
        if (token) {
            fetchProfile();
        } else {
            setUser(null);
            setLoading(false);
        }
    }, [token, fetchProfile]);

    const login = async (email, password) => {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(parseApiError(data));
        }
        localStorage.setItem('mp_token', data.accessToken);
        setToken(data.accessToken);
        setUser(data.user);
        return data.user;
    };

    const register = async (name, email, password) => {
        const res = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, role: 'CLIENT' })
        });
        const data = await res.json();
        if (!res.ok) {
            throw new Error(parseApiError(data));
        }
        localStorage.setItem('mp_token', data.accessToken);
        setToken(data.accessToken);
        setUser(data.user);
        return data.user;
    };

    const navigateToLogin = (returnUrl) => {
        const currentHash = returnUrl || window.location.hash || '#inicio';
        if (currentHash !== '#login' && currentHash !== '#iniciar-sesion') {
            sessionStorage.setItem('mp_return_url', currentHash);
        }
        window.location.hash = '#login';
    };

    const redirectAfterLogin = () => {
        const returnUrl = sessionStorage.getItem('mp_return_url') || '#inicio';
        sessionStorage.removeItem('mp_return_url');
        window.location.hash = returnUrl;
    };

    return (
        <AuthContext.Provider value={{
            user,
            token,
            loading,
            login,
            register,
            logout,
            navigateToLogin,
            redirectAfterLogin
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
    }
    return context;
};
