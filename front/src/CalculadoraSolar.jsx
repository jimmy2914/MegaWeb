import { useState } from 'react';
import './CalculadoraSolar.css';

const API_URL = 'http://localhost:3000/api/v1';

function CalculadoraSolar() {
  // Cliente Inputs
  const [cliente, setCliente] = useState({
    nombre: '',
    ciudad: '',
    direccion: '',
    celular: '',
    email: '',
  });

  // Solar System Inputs
  const [solarData, setSolarData] = useState({
    consumo_diario: '',
    voltaje_sistema: '24', // default selection
    dias_autonomia: '1',
    horas_sol_pico: '4',
    voltaje_bateria: '12',
    capacidad_bateria: '150',
    profundidad_descarga: '50',
    potencia_panel: '400',
    potencia_pico: '1500',
  });

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  const handleClienteChange = (e) => {
    const { name, value } = e.target;
    setCliente((prev) => ({ ...prev, [name]: value }));
  };

  const handleSolarChange = (e) => {
    const { name, value } = e.target;
    setSolarData((prev) => ({ ...prev, [name]: value }));
  };

  const handleClear = () => {
    setCliente({
      nombre: '',
      ciudad: '',
      direccion: '',
      celular: '',
      email: '',
    });
    setSolarData({
      consumo_diario: '',
      voltaje_sistema: '24',
      dias_autonomia: '1',
      horas_sol_pico: '4',
      voltaje_bateria: '12',
      capacidad_bateria: '150',
      profundidad_descarga: '50',
      potencia_panel: '400',
      potencia_pico: '1500',
    });
    setResults(null);
    setError('');
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validate inputs
    const required = [
      'consumo_diario',
      'voltaje_sistema',
      'dias_autonomia',
      'horas_sol_pico',
      'voltaje_bateria',
      'capacidad_bateria',
      'profundidad_descarga',
      'potencia_panel',
      'potencia_pico',
    ];

    for (const key of required) {
      if (!solarData[key] || isNaN(Number(solarData[key])) || Number(solarData[key]) <= 0) {
        setError('Por favor, ingresa valores numéricos mayores a cero en todos los parámetros técnicos.');
        setLoading(false);
        return;
      }
    }

    try {
      const payload = {
        location: {
          city: cliente.ciudad || 'Bogota',
          department: 'Cundinamarca',
          latitude: 4.711,
          longitude: -74.0721,
        },
        averageDailyConsumptionKWh: Number(solarData.consumo_diario) / 1000,
        peakPowerDemandKw: Number(solarData.potencia_pico) / 1000,
        panelType: 'monocrystalline',
        panelEfficiency: 0.20,
        inverterEfficiency: 0.90,
        systemLossesPercentage: 15,
        tiltAngle: 15,
        orientation: 'SUR',
        // Pass original PyQt fields for our service mapping
        consumo_diario: Number(solarData.consumo_diario),
        voltaje_sistema: Number(solarData.voltaje_sistema),
        dias_autonomia: Number(solarData.dias_autonomia),
        horas_sol_pico: Number(solarData.horas_sol_pico),
        voltaje_bateria: Number(solarData.voltaje_bateria),
        capacidad_bateria: Number(solarData.capacidad_bateria),
        profundidad_descarga: Number(solarData.profundidad_descarga),
        potencia_panel: Number(solarData.potencia_panel),
        potencia_pico: Number(solarData.potencia_pico),
      };

      const res = await fetch(`${API_URL}/solar/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Error en el cálculo');
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPdf = async () => {
    setError('');
    setPdfLoading(true);

    const payload = {
      location: {
        city: cliente.ciudad || 'Bogota',
        department: 'Cundinamarca',
        latitude: 4.711,
        longitude: -74.0721,
      },
      averageDailyConsumptionKWh: Number(solarData.consumo_diario) / 1000 || 0,
      peakPowerDemandKw: Number(solarData.potencia_pico) / 1000 || 0,
      panelType: 'monocrystalline',
      panelEfficiency: 0.20,
      inverterEfficiency: 0.90,
      systemLossesPercentage: 15,
      tiltAngle: 15,
      orientation: 'SUR',
      cliente,
      // original PyQt fields
      consumo_diario: Number(solarData.consumo_diario) || 0,
      voltaje_sistema: Number(solarData.voltaje_sistema) || 24,
      dias_autonomia: Number(solarData.dias_autonomia) || 1,
      horas_sol_pico: Number(solarData.horas_sol_pico) || 4,
      voltaje_bateria: Number(solarData.voltaje_bateria) || 12,
      capacidad_bateria: Number(solarData.capacidad_bateria) || 150,
      profundidad_descarga: Number(solarData.profundidad_descarga) || 50,
      potencia_panel: Number(solarData.potencia_panel) || 400,
      potencia_pico: Number(solarData.potencia_pico) || 1500,
    };

    try {
      const res = await fetch(`${API_URL}/solar/export-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || 'Error al generar el PDF del reporte.');
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'reporte_solar.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <section className="calculadora-section" id="calculadora">
      <div className="calculadora-container">
        <div className="calculadora-header">
          <h2>Calculadora Solar</h2>
          <p className="calculadora-subtitle">
            Dimensiona tu sistema solar fotovoltaico de manera rápida y precisa basándote en tus consumos diarios.
          </p>
        </div>

        <form onSubmit={handleCalculate} className="calculadora-form">
          <div className="calculadora-grid-layouts single-column">
            {/* Parámetros del Sistema */}
            <div className="calculadora-card-wrapper">
              <h3 className="card-title-highlight">Parámetros del Sistema</h3>
              
              <div className="form-row-custom">
                <div className="form-group-custom">
                  <label>Consumo Diario (Wh)</label>
                  <input
                    type="number"
                    name="consumo_diario"
                    placeholder="Ej. 5000"
                    value={solarData.consumo_diario}
                    onChange={handleSolarChange}
                    required
                  />
                </div>
                <div className="form-group-custom">
                  <label>Voltaje del Sistema (V)</label>
                  <select
                    name="voltaje_sistema"
                    value={solarData.voltaje_sistema}
                    onChange={handleSolarChange}
                  >
                    <option value="12">12 V</option>
                    <option value="24">24 V</option>
                    <option value="48">48 V</option>
                  </select>
                </div>
              </div>

              <div className="form-row-custom">
                <div className="form-group-custom">
                  <label>Días de Autonomía</label>
                  <input
                    type="number"
                    name="dias_autonomia"
                    placeholder="Ej. 1"
                    value={solarData.dias_autonomia}
                    onChange={handleSolarChange}
                    required
                  />
                </div>
                <div className="form-group-custom">
                  <label>Horas Sol Pico (HSP)</label>
                  <input
                    type="number"
                    step="0.1"
                    name="horas_sol_pico"
                    placeholder="Ej. 4.2"
                    value={solarData.horas_sol_pico}
                    onChange={handleSolarChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row-custom">
                <div className="form-group-custom">
                  <label>Voltaje Batería (V)</label>
                  <select
                    name="voltaje_bateria"
                    value={solarData.voltaje_bateria}
                    onChange={handleSolarChange}
                  >
                    <option value="12">12 V</option>
                    <option value="24">24 V</option>
                  </select>
                </div>
                <div className="form-group-custom">
                  <label>Capacidad Batería (Ah)</label>
                  <input
                    type="number"
                    name="capacidad_bateria"
                    placeholder="Ej. 150"
                    value={solarData.capacidad_bateria}
                    onChange={handleSolarChange}
                    required
                  />
                </div>
              </div>

              <div className="form-row-custom">
                <div className="form-group-custom">
                  <label>Prof. de Descarga (%)</label>
                  <input
                    type="number"
                    name="profundidad_descarga"
                    placeholder="Ej. 50"
                    value={solarData.profundidad_descarga}
                    onChange={handleSolarChange}
                    required
                  />
                </div>
                <div className="form-group-custom">
                  <label>Potencia Panel (W)</label>
                  <input
                    type="number"
                    name="potencia_panel"
                    placeholder="Ej. 400"
                    value={solarData.potencia_panel}
                    onChange={handleSolarChange}
                    required
                  />
                </div>
              </div>

              <div className="form-group-custom">
                <label>Potencia Pico Requerida (W)</label>
                <input
                  type="number"
                  name="potencia_pico"
                  placeholder="Ej. 1500"
                  value={solarData.potencia_pico}
                  onChange={handleSolarChange}
                  required
                />
              </div>
            </div>
          </div>

          {error && <div className="calculadora-error-banner">{error}</div>}

          <div className="calculadora-actions">
            <button type="submit" className="btn-calculadora btn-primary-custom" disabled={loading}>
              {loading ? 'Calculando...' : 'Calcular'}
            </button>
            <button type="button" onClick={handleClear} className="btn-calculadora btn-secondary-custom">
              Limpiar
            </button>
            <button
              type="button"
              onClick={() => setShowPdfModal(true)}
              className="btn-calculadora btn-accent-custom"
              disabled={pdfLoading}
            >
              {pdfLoading ? 'Generando PDF...' : 'Exportar PDF'}
            </button>
          </div>
        </form>

        {results && (
          <div className="calculadora-results-card">
            <h3>Resultados del Dimensionamiento</h3>
            <div className="results-grid">
              <div className="result-item-card">
                <div className="result-icon">☀️</div>
                <div className="result-info">
                  <h4>Paneles Necesarios</h4>
                  <p className="result-value">{results.paneles_necesarios} uds</p>
                  <span>Módulos solares de {solarData.potencia_panel}W</span>
                </div>
              </div>
              <div className="result-item-card">
                <div className="result-icon">⚡</div>
                <div className="result-info">
                  <h4>Capacidad del Inversor</h4>
                  <p className="result-value">{results.capacidad_inversor} W</p>
                  <span>Margen de seguridad del 25% incluido</span>
                </div>
              </div>
              <div className="result-item-card">
                <div className="result-icon">🔋</div>
                <div className="result-info">
                  <h4>Baterías Necesarias</h4>
                  <p className="result-value">{results.baterias_necesarias} uds</p>
                  <span>Acumuladores de {solarData.capacidad_bateria}Ah @ {solarData.voltaje_bateria}V</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showPdfModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Datos del Cliente (Opcional)</h3>
            <p className="modal-subtitle">
              Ingrese los datos del cliente para incluirlos en el reporte PDF. Puede dejarlos en blanco para exportar solo los cálculos técnicos.
            </p>
            <div className="modal-form-groups">
              <div className="form-group-custom">
                <label>Nombre del Cliente</label>
                <input
                  type="text"
                  name="nombre"
                  placeholder="Ej. Juan Pérez"
                  value={cliente.nombre}
                  onChange={handleClienteChange}
                />
              </div>
              <div className="form-group-custom">
                <label>Ciudad</label>
                <input
                  type="text"
                  name="ciudad"
                  placeholder="Ej. Bogotá"
                  value={cliente.ciudad}
                  onChange={handleClienteChange}
                />
              </div>
              <div className="form-group-custom">
                <label>Dirección</label>
                <input
                  type="text"
                  name="direccion"
                  placeholder="Ej. Calle 123 #45-67"
                  value={cliente.direccion}
                  onChange={handleClienteChange}
                />
              </div>
              <div className="form-row-custom">
                <div className="form-group-custom">
                  <label>Celular</label>
                  <input
                    type="text"
                    name="celular"
                    placeholder="Ej. 3001234567"
                    value={cliente.celular}
                    onChange={handleClienteChange}
                  />
                </div>
                <div className="form-group-custom">
                  <label>Correo Electrónico</label>
                  <input
                    type="email"
                    name="email"
                    placeholder="Ej. juan@correo.com"
                    value={cliente.email}
                    onChange={handleClienteChange}
                  />
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-calculadora btn-accent-custom"
                onClick={async () => {
                  setShowPdfModal(false);
                  await handleExportPdf();
                }}
                disabled={pdfLoading}
              >
                Generar PDF
              </button>
              <button
                type="button"
                className="btn-calculadora btn-secondary-custom"
                onClick={() => setShowPdfModal(false)}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default CalculadoraSolar;
