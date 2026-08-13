import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import ReactGA from 'react-ga'; // Importar react-ga

// Inicializa Google Analytics con tu ID de seguimiento
ReactGA.initialize('TU_ID_DE_SEGUIMIENTO'); // Reemplaza con tu ID de seguimiento

// Registra la página vista al inicio
ReactGA.pageview(window.location.pathname + window.location.search);

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
