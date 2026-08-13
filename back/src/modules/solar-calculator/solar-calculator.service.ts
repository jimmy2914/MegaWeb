import { Injectable, BadRequestException } from '@nestjs/common';
import { SolarCalculationInputDto } from './dto/solar-calculation.dto';
import { ExportPdfDto } from './dto/export-pdf.dto';
import { PdfService } from '../../common/services/pdf.service';

@Injectable()
export class SolarCalculatorService {
  constructor(private readonly pdfService: PdfService) {}

  /**
   * Perform solar system calculations based on the same formulas used in the PyQt desktop app (main.py).
   * Returns an object with the derived values.
   */
  calculate(input: SolarCalculationInputDto) {

    // Validate required fields
    const rawInput = input as any;
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
    for (const field of required) {
      if (rawInput[field] === undefined || rawInput[field] === null) {
        throw new BadRequestException(`Missing required field: ${field}`);
      }
    }

    const consumo_diario = Number(rawInput['consumo_diario']);
    const voltaje_sistema = Number(rawInput['voltaje_sistema']);
    const dias_autonomia = Number(rawInput['dias_autonomia']);
    const horas_sol_pico = Number(rawInput['horas_sol_pico']);
    const voltaje_bateria = Number(rawInput['voltaje_bateria']);
    const capacidad_bateria = Number(rawInput['capacidad_bateria']);
    const profundidad_descarga = Number(rawInput['profundidad_descarga']) / 100;
    const potencia_panel = Number(rawInput['potencia_panel']);
    const potencia_pico = Number(rawInput['potencia_pico']);

    // ---- Cálculos ----
    // 1. Consumo diario en Ah (usando voltaje del sistema)
    const consumo_ah = consumo_diario / voltaje_sistema;

    // 2. Consumo total durante los días de autonomía en Ah
    const consumo_autonomia = consumo_ah * dias_autonomia;

    // 3. Consumo total considerando la profundidad de descarga en Ah
    const consumo_descarga = consumo_autonomia / (1 - profundidad_descarga);

    // 4. Número de baterías necesarias (redondeado al entero más cercano)
    const num_baterias = Math.round(
      (consumo_diario * dias_autonomia * 1.15) /
        (profundidad_descarga * voltaje_bateria * capacidad_bateria),
    );

    // 5. Capacidad del inversor (con factor de seguridad de 1.25)
    const capacidad_inversor = potencia_pico * 1.25;

    // --- Cálculo de la cantidad de paneles ---
    // Energía total de las baterías (Wh)
    const energia_baterias = voltaje_bateria * capacidad_bateria * num_baterias;

    // Energía diaria necesaria para cargar las baterías (Wh)
    const energia_diaria_baterias = energia_baterias;

    // Energía total diaria necesaria (Wh), incluyendo el consumo diario
    const energia_total_diaria = energia_diaria_baterias + consumo_diario;

    // Energía que produce un panel solar al día (Wh)
    const energia_diaria_panel = potencia_panel * horas_sol_pico;

    // Número de paneles necesarios (considerando eficiencia y margen de seguridad)
    const eficiencia_sistema = 0.85; // Eficiencia del sistema
    const margen_seguridad = 1.2; // Margen de seguridad
    const num_paneles = Math.round(
      energia_total_diaria / (energia_diaria_panel * eficiencia_sistema * margen_seguridad),
    );

    return {
      paneles_necesarios: num_paneles,
      capacidad_inversor: Number(capacidad_inversor.toFixed(2)),
      baterias_necesarias: num_baterias,
    };
  }

  /** Export a PDF using the same template as the desktop app */
  async exportPdf(dto: ExportPdfDto): Promise<Buffer> {
    const result = this.calculate(dto as any);
    return this.pdfService.generateSolarReport(dto as any, result);
  }

  // Stub methods for project persistence – they can stay as‑is for now
  saveProject(userId: string, data: any) {
    return { id: String(Date.now()), ...data, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  listProjects(userId: string) {
    return { projects: [] };
  }
  getProject(id: string) {
    return { id, name: 'Projecto ejemplo', description: 'Guardado', input: {}, result: {}, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  }
  deleteProject(id: string) {
    return { success: true };
  }
}
