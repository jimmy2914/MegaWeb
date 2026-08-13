import React, { useState } from "react";
import './Nav.css'; // Importamos los estilos CSS

function Nav() {
    const [isOpen, setIsOpen] = useState(false); // Estado para manejar el menú abierto/cerrado

    const toggleMenu = () => {
        setIsOpen(!isOpen); // Alterna entre abrir y cerrar el menú
    };

    const handleLinkClick = () => {
        setIsOpen(false); // Cierra el menú al hacer clic en un enlace
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
                </ul>
                <div className="hamburger" onClick={toggleMenu}>
                    {/* Botón de menú hamburguesa */}
                    <span className="bar"></span>
                    <span className="bar"></span>
                    <span className="bar"></span>
                </div>
            </div>
        </nav>
    );
}

export default Nav;
