import React, { useState } from "react";
import { useAuth } from "./AuthContext";
import './Nav.css';

function Nav() {
    const [isOpen, setIsOpen] = useState(false);
    const { user, navigateToLogin } = useAuth();

    const toggleMenu = () => {
        setIsOpen(!isOpen);
    };

    const handleLinkClick = () => {
        setIsOpen(false);
    };

    const handleLoginClick = (e) => {
        e.preventDefault();
        setIsOpen(false);
        const currentHash = window.location.hash || '#inicio';
        navigateToLogin(currentHash);
    };

    return (
        <nav>
            <div className="navbar-left">
                <a href="#inicio"> <img src="/logo.webp" alt="Logo Empresa" className="logo" /> </a>
            </div>
            <div className="navbar-right">
                <ul className={isOpen ? "nav-links open" : "nav-links"}>
                    <li><a href="#inicio" onClick={handleLinkClick}>Inicio</a></li>
                    <li><a href="#servicio" onClick={handleLinkClick}>Servicios</a></li>
                    <li><a href="#nosotros" onClick={handleLinkClick}>Nosotros</a></li>
                    <li><a href="#proyectos" onClick={handleLinkClick}>Proyectos</a></li>
                    <li><a href="#tienda" onClick={handleLinkClick}>Tienda</a></li>
                    <li><a href="#calculadora" onClick={handleLinkClick}>Calculadora</a></li>
                    <li><a href="#foro" onClick={handleLinkClick}>Comunidad</a></li>
                    <li><a href="https://webmail.megaproyectos.net/SOGo/" target="_blank" rel="noopener noreferrer" onClick={handleLinkClick}>Correo</a></li>
                    <li><a href="https://megaproyectos.net/Soporte/upload/" target="_blank" rel="noopener noreferrer" onClick={handleLinkClick}>Soporte</a></li>
                    <li className="nav-item-auth">
                        {user ? (
                            <a href="#login" onClick={handleLinkClick} className="nav-user-link">
                                <svg className="nav-login-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                                <span>{user.name.split(' ')[0]}</span>
                            </a>
                        ) : (
                            <a href="#login" onClick={handleLoginClick} className="nav-login-btn">
                                <svg className="nav-login-svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                </svg>
                                <span>Iniciar Sesión</span>
                            </a>
                        )}
                    </li>
                </ul>
                <div className="hamburger" onClick={toggleMenu}>
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                </div>
            </div>
        </nav>
    );
}

export default Nav;
