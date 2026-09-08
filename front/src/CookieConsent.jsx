import { useState } from 'react';
import './CookieConsent.css'; // Puedes agregar tu propio estilo

const CookieConsent = () => {
    const [isVisible, setIsVisible] = useState(true);

    const handleAccept = () => {
        // Configura la cookie de consentimiento
        document.cookie = "cookieConsent=true; path=/; max-age=" + 60 * 60 * 24 * 30; // Expira en 30 días

        // Aquí puedes agregar el código de Google Analytics
        //window.gtag('config', 'TU_ID_DE_SEGUIMIENTO'); // Reemplaza con tu ID de seguimiento

        setIsVisible(false);
    };

    return (
        isVisible && (
            <div className="cookie-consent">
                <p>
                    Utilizamos cookies para mejorar su experiencia. Al continuar, acepta el uso de cookies.
                </p>
                <button onClick={handleAccept}>Aceptar</button>
            </div>
        )
    );
};

export default CookieConsent;
