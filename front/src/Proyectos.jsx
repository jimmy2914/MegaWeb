import './Proyectos.css';

function Proyectos() {
    return (
        <section id="proyectos" className="proyectos-section">
            <h2>PROYECTOS</h2>
            <div className="proyectos-grid">
    <div className="proyecto-card">
        <iframe 
            width="560" 
            height="315" 
            src="https://www.youtube.com/embed/RMG_7K_Wzos?si=-TlVI-XRBECOeRY-&amp?controls=1&showinfo=0&rel=0&autoplay=0&modestbranding=1" 
            title="Proyecto 1" 
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
        ></iframe>
        
    </div>

    <div className="proyecto-card">
        <iframe 
            width="560" 
            height="315" 
            src="https://www.youtube.com/embed/HBuMa_gCdmQ?si=0XAIgyrLAUZvh_wp?controls=0&showinfo=0&rel=0&autoplay=0&modestbranding=1" 
            title="Proyecto 2" 
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
        ></iframe>
        
        
        
    </div>
    {/* Añadir más proyectos */}
</div>
        </section>
    );
}

export default Proyectos;
