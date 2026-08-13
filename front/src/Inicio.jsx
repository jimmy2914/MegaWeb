import './Inicio.css'; // Importamos los estilos CSS

function Inicio() {
    return (
        <section id="inicio" className="inicio-section">
            <div className="overlay">
                <h1>LIDERANDO<br></br> CONOCIMIENTO Y <br></br>TECNOLOGÍA PARA UN <br></br>FUTURO SOSTENIBLE </h1>
                <a href="#servicio">
                    <img src="/flecha_abajo.webp" alt="Flecha hacia abajo" className="flecha-abajo" />
                </a>
            </div>
        </section>
    );
}

export default Inicio;