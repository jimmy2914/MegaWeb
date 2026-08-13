import './Servicios.css';

function Servicios() {
    return (
        <section id="servicio" className="servicios-section">
            <h2>SERVICIOS</h2>
            <div className="servicios-grid">
                <div className="servicio-card">
                    <img src="/servicios/home_services1.webp" alt="Planeamiento" />
                    <h3>ENERGIA</h3>
                    <ul>
                        <li>Líneas de Transmisión, Distribución, Alumbrado Publico</li>
                        <li>Redes eléctricas comerciales e industriales.</li>
                        <li>Energía Solar.</li>
                        <li>Iluminación exterior.</li>
                        <li>Iluminación comercial. </li>
                        <li>Iluminación inteligente (dimerizada y on-off).</li>
                        <li>Sistemas on-grid, off-grid..</li>
                        <li>Diseños y cálculos de ingeniería.</li>
                        <li>Infraestructura de montaje (suelo y cubierta).</li>

                    </ul>
                </div>
                <div className="servicio-card">
                    <img src="/servicios/home_services2.webp" alt="Maquetas" />
                    <h3>COMUNICACION INDUSTRIAL COMERCIAL</h3>
                    <ul>
                        <li>Redes de comunicación industrial y comercial.</li>
                        <li>Monitorización y control (protocolo industrial, modbus, serial, iec61850, etc.) Para sistemas BMS y SCADA.</li>
                        <li>Fibra optica, cobre.</li>
                        <li>Radio enlaces de comunicación y redes wifi.</li>
                        <li>Radio comunicación industrial.</li>
                    </ul>
                </div>
                <div className="servicio-card">
                    <img src="/servicios/home_services3.webp" alt="Construcción" />
                    <h3>SEGURIDAD ELECTRONICA</h3>
                    <ul>
                        <li>CCTV térmico.</li>
                        <li>CCTV óptico y PTZ.</li>
                        <li>Centro de control.</li>
                        <li>Radares de protección perimetral.</li>
                        <li>Cable sensor (microfónico, fibra sensor).</li>
                    </ul>
                </div>
                <div className="servicio-card">
                    <img src="/servicios/home_services4.webp" alt="Otro Servicio" />
                    <h3>DETECCIÓN Y EXTINCIÓN DE INCENDIO</h3>
                    <ul>
                        <li>Paneles inteligentes o convencionales.</li>
                        <li>Detección de humo.</li>
                        <li>Temperatura, flama.</li>
                        <li>Extinción de incendios.</li>
                        <li>Audio evacuación .</li>
                        <li>Sistemas intrínsecamente seguros.</li>
                        <li>Cámaras térmicas detección incendio PSFV.</li>
                    </ul>
                </div>
                
            </div>
        </section>
    );
}

export default Servicios;
