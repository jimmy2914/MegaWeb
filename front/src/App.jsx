import React, { useEffect, useState } from 'react';
import Nav from "./Nav";
import Inicio from './Inicio';
import Servicios from "./Servicios";
import Nosotros from "./Nosotros";
import Proyectos from "./Proyectos";
import Clientes from "./Clientes";
import Tienda from "./Tienda";
import CalculadoraSolar from "./CalculadoraSolar";
import Foro from "./Foro";
import Footer from "./Footer";
import CookieConsent from "./CookieConsent";
import ReactGA from 'react-ga'; // Importar react-ga
import WhatsAppIcon from './WhatsAppIcon';

function App() {
    const [currentView, setCurrentView] = useState('inicio');

    useEffect(() => {
        // Verifica el consentimiento de cookies antes de registrar la vista de la página
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
                setCurrentView('calculadora');
            } else if (hash === '#foro') {
                setCurrentView('foro');
            } else {
                setCurrentView('inicio');
            }
        };

        // Escuchar cambios de hash
        handleHashChange();
        window.addEventListener('hashchange', handleHashChange);
        return () => window.removeEventListener('hashchange', handleHashChange);
    }, []);

    useEffect(() => {
        // Asegurar scroll suave cuando volvemos a la página principal y hay un hash de sección
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
            // Scroll arriba al cambiar de vista
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
        {currentView === 'calculadora' && (
          <div className="page-view animate-fade-in">
            <CalculadoraSolar />
          </div>
        )}
        {currentView === 'foro' && (
          <div className="page-view animate-fade-in">
            <Foro />
          </div>
        )}
        <Footer />
        <CookieConsent />
        <WhatsAppIcon />
      </div>
    );
}

export default App;
