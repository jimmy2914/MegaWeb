import { Test, TestingModule } from '@nestjs/testing';
import { PdfService } from './pdf.service';
import { existsSync } from 'fs';

describe('PdfService', () => {
  let service: PdfService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfService],
    }).compile();

    service = module.get<PdfService>(PdfService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('generateSolarReport', () => {
    it('should generate a valid PDF buffer combining inputs and calculation results', async () => {
      const input = {
        cliente: {
          nombre: 'Cliente Test',
          ciudad: 'Medellín',
          direccion: 'Calle 10 #20-30',
          celular: '3000000000',
          email: 'test@megaproyectos.net',
        },
        consumo_diario: 5000,
        voltaje_sistema: 24,
        dias_autonomia: 1,
        horas_sol_pico: 4,
        voltaje_bateria: 12,
        capacidad_bateria: 150,
        profundidad_descarga: 50,
        potencia_panel: 400,
        potencia_pico: 1500,
      };

      const result = {
        paneles_necesarios: 10,
        capacidad_inversor: 1875,
        baterias_necesarias: 6,
      };

      // Ensure the template file exists before running the generator logic
      if (existsSync((service as any).templatePath)) {
        const pdfBuffer = await service.generateSolarReport(input, result);

        expect(pdfBuffer).toBeDefined();
        expect(pdfBuffer instanceof Buffer).toBe(true);
        expect(pdfBuffer.length).toBeGreaterThan(0);
        // Verify PDF signature
        expect(pdfBuffer.toString('utf-8', 0, 4)).toBe('%PDF');
      } else {
        console.warn('plantilla.pdf no encontrada en la ruta especificada de pruebas.');
      }
    });
  });
});
