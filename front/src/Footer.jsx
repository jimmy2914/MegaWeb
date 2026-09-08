import { FaLinkedin, FaYoutube, FaInstagram, FaWhatsapp, FaPhone, FaEnvelope } from 'react-icons/fa'; // Importamos los iconos
import './Footer.css'; 

function Footer() {
    return (
        <footer className="footer">
            <div className="footer-container">
                <div className="footer-logo">
                <a href="#inicio"> <img src="/logo.webp" alt="Logo Empresa" className="logo" /> </a>
                    <p>Mega Proyectos de Tecnología</p>
                </div>
                
                {/* Iconos de contacto */}
                <div className='footer-contact'>
                    <a href="tel:3126217709 " aria-label="Phone">
                        <FaPhone />
                        <span>+57 3126217709 </span>
                    </a>
                    <a href="mailto:comercialcentro@megaproyectos.net" aria-label="Email">
                        <FaEnvelope />
                        <span> comercialcentro@megaproyectos.net </span>
                    </a>
                    <a href="/Politicas.pdf" target="_blank" rel="noopener noreferrer">
                    Políticas de Privacidad
                    </a>
                    <p>&copy; 2024 Mega Proyectos de Tecnología. Todos los derechos reservados.</p>
                </div>

                <div className="footer-social">
                    {/* Iconos de redes sociales */}
                    <a href="https://www.linkedin.com/company/megaproyectos-de-tecnologia" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                        <FaLinkedin />
                    </a>
                    <a href="https://www.youtube.com/channel/UCcOq7ufb0UnFRgGzMwmK4Eg" target="_blank" rel="noopener noreferrer" aria-label="YouTube">
                        <FaYoutube />
                    </a>
                    <a href="https://www.instagram.com/megaproyectosdt/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                        <FaInstagram />
                    </a>
                    <a href="https://api.whatsapp.com/send?phone=573126217709 " target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
                        <FaWhatsapp />
                    </a>
                </div>
            </div>
            <div className="footer-rights">
                
            </div>
        </footer>
    );
}

export default Footer;
