import { useEffect, useState } from 'react';
import Nav from "./Nav";
import Inicio from './Inicio';
import Servicios from "./Servicios";
import Nosotros from "./Nosotros";
import Proyectos from "./Proyectos";
import Clientes from "./Clientes";
import Tienda from "./Tienda";
import CalculadoraSolar from "./CalculadoraSolar";
import Foro from "./Foro";
import Login from "./Login";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";
import ReactGA from 'react-ga';
import WhatsAppIcon from './WhatsAppIcon';
import { AuthProvider, useAuth } from './AuthContext';
import { CartProvider } from './CartContext';

function AppContent() {
    const [currentView, setCurrentView] = useState('inicio');
    const { user, loading } = useAuth();
    const isAdmin = user?.role === 'ADMIN';

    useEffect(() => {
        if (document.cookie.includes('cookieConsent=true')) {
            ReactGA.pageview(window.location.pathname + window.location.search);
        }
    }, []);

    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash || '#inicio';
            if (hash === '#tienda') {
                setCurrentView('tienda');
            } else if (hash === '#calculadora') {
                setCurrentView(isAdmin ? 'calculadora' : 'inicio');
            } else if (hash === '#foro') {
                setCurrentView('foro');
            } else if (hash === '#login' || hash === '#iniciar-sesion') {
                setCurrentView('login');
            } else {
                setCurrentView('inicio');
            }
        };

        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, [isAdmin]);

    useEffect(() => {
        if (!loading && window.location.hash === '#calculadora' && !isAdmin) {
            window.location.hash = '#inicio';
        }
    }, [isAdmin, loading]);

    useEffect(() => {
        if (currentView === 'inicio') {
            const hash = window.location.hash;
            if (hash && hash !== '#inicio') {
                setTimeout(() => {
                    const element = document.querySelector(hash);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth' });
                    }
                }, 100);
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } else {
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
    }, [currentView]);

    return (
        <div className='container'>
            <Nav />
            {currentView === 'inicio' && (
                <>
                    <Inicio />
                    <Servicios />
                    <Nosotros />
                    <Proyectos />
                    <Clientes />
                </>
            )}
            {currentView === 'tienda' && (
                <div className="page-view animate-fade-in">
                    <Tienda />
                </div>
            )}
            {currentView === 'calculadora' && isAdmin && (
                <div className="page-view animate-fade-in">
                    <CalculadoraSolar />
                </div>
            )}
            {currentView === 'foro' && (
                <div className="page-view animate-fade-in">
                    <Foro />
                </div>
            )}
            {currentView === 'login' && (
                <div className="page-view animate-fade-in">
                    <Login />
                </div>
            )}
            <Footer />
            <CookieConsent />
            <WhatsAppIcon />
        </div>
    );
}

function App() {
    return (
        <AuthProvider>
            <CartProvider>
                <AppContent />
            </CartProvider>
        </AuthProvider>
    );
}

export default App;
