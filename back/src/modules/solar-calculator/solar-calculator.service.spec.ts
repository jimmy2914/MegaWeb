import { Test, TestingModule } from '@nestjs/testing';
import { SolarCalculatorService } from './solar-calculator.service';
import { PdfService } from '../../common/services/pdf.service';
import { BadRequestException } from '@nestjs/common';

describe('SolarCalculatorService', () => {
  let service: SolarCalculatorService;
  let mockPdfService: Partial<PdfService>;

  beforeEach(async () => {
    mockPdfService = {
      generateSolarReport: jest.fn().mockResolvedValue(Buffer.from('%PDF-1.4...')),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SolarCalculatorService,
        { provide: PdfService, useValue: mockPdfService },
      ],
    }).compile();

    service = module.get<SolarCalculatorService>(SolarCalculatorService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculate', () => {
    it('should calculate solar elements correctly for valid inputs', () => {
      const input = {
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

      const result = service.calculate(input as any);

      // Expected math validation:
      // 1. num_baterias = Math.round((5000 * 1 * 1.15) / (0.5 * 12 * 150)) = Math.round(6.38) = 6
      // 2. capacidad_inversor = 1500 * 1.25 = 1875
      // 3. energia_total_diaria = (12 * 150 * 6) + 5000 = 15800 Wh
      //    energia_diaria_panel = 400 * 4 = 1600 Wh
      //    num_paneles = Math.round(15800 / (1600 * 0.85 * 1.2)) = Math.round(9.68) = 10
      expect(result).toEqual({
        paneles_necesarios: 10,
        capacidad_inversor: 1875,
        baterias_necesarias: 6,
      });
    });

    it('should throw BadRequestException if any required field is missing', () => {
      const incompleteInput = {
        consumo_diario: 5000,
        voltaje_sistema: 24,
        dias_autonomia: 1,
        // horas_sol_pico is missing
        voltaje_bateria: 12,
        capacidad_bateria: 150,
        profundidad_descarga: 50,
        potencia_panel: 400,
        potencia_pico: 1500,
      };

      expect(() => service.calculate(incompleteInput as any)).toThrow(BadRequestException);
      expect(() => service.calculate(incompleteInput as any)).toThrow('Missing required field: horas_sol_pico');
    });
  });

  describe('exportPdf', () => {
    it('should perform calculations and generate a PDF buffer using PdfService', async () => {
      const input = {
        consumo_diario: 5000,
        voltaje_sistema: 24,
        dias_autonomia: 1,
        horas_sol_pico: 4,
        voltaje_bateria: 12,
        capacidad_bateria: 150,
        profundidad_descarga: 50,
        potencia_panel: 400,
        potencia_pico: 1500,
        cliente: {
          nombre: 'Juan Pérez',
          ciudad: 'Bogotá',
        },
      };

      const pdfBuffer = await service.exportPdf(input as any);

      expect(pdfBuffer).toBeDefined();
      expect(pdfBuffer.toString()).toContain('%PDF');
      expect(mockPdfService.generateSolarReport).toHaveBeenCalledWith(
        input,
        expect.objectContaining({
          paneles_necesarios: 10,
          capacidad_inversor: 1875,
          baterias_necesarias: 6,
        }),
      );
    });
  });
});
