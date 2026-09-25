import { SolarCalculatorController } from './solar-calculator.controller';

describe('SolarCalculatorController', () => {
  let controller: SolarCalculatorController;
  let solar: Record<'calculate' | 'exportPdf' | 'saveProject' | 'listProjects' | 'getProject' | 'deleteProject', jest.Mock>;
  const req = { user: { id: 'u1' } };

  beforeEach(() => {
    solar = {
      calculate: jest.fn(),
      exportPdf: jest.fn(),
      saveProject: jest.fn(),
      listProjects: jest.fn(),
      getProject: jest.fn(),
      deleteProject: jest.fn(),
    };
    controller = new SolarCalculatorController(solar as any);
  });

  it('calculate forwards the input', () => {
    controller.calculate({ consumo_diario: 1 });
    expect(solar.calculate).toHaveBeenCalledWith({ consumo_diario: 1 });
  });

  it('exportPdf sends the PDF with the right headers', async () => {
    const buffer = Buffer.from('%PDF-fake');
    solar.exportPdf.mockResolvedValue(buffer);
    const res = { set: jest.fn(), end: jest.fn() };

    await controller.exportPdf({} as any, res as any);

    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=reporte_solar.pdf',
      'Content-Length': String(buffer.length),
    });
    expect(res.end).toHaveBeenCalledWith(buffer);
  });

  it('project endpoints use the authenticated user or the project id', () => {
    controller.saveProject(req, { name: 'p' });
    controller.listProjects(req);
    controller.getProject('pr1');
    controller.deleteProject('pr1');
    expect(solar.saveProject).toHaveBeenCalledWith('u1', { name: 'p' });
    expect(solar.listProjects).toHaveBeenCalledWith('u1');
    expect(solar.getProject).toHaveBeenCalledWith('pr1');
    expect(solar.deleteProject).toHaveBeenCalledWith('pr1');
  });
});
