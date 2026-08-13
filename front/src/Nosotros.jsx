import './Nosotros.css';

function Nosotros() {
    return (
        <section id="nosotros" className="nosotros-section">
            <div className="nosotros-content">
                <div className="nosotros-text">
                    <h2>Nosotros</h2>
                    <p>
                        Somos una empresa comprometida con la excelencia y el
                        desarrollo de soluciones innovadoras. Nuestro equipo de
                        expertos trabaja incansablemente para brindar los mejores
                        resultados a nuestros clientes.
                    </p>
                </div>
                <div className="nosotros-image parallax">
                    {/* Aquí va la imagen de fondo para el efecto parallax */}
                </div>
            </div>
        </section>
    );
}

export default Nosotros;
