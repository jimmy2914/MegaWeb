import { Injectable } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PDFDocument } from 'pdf-lib';

/**
 * Service responsible for generating PDF reports for the solar calculator.
 * It uses the existing `plantilla.pdf` as a background template and writes the
 * input data and calculation results onto it using the same coordinates as the
 * original PyQt desktop application.
 */
@Injectable()
export class PdfService {
  private readonly templatePath = join(__dirname, '../../../assets/plantilla.pdf');
  private readonly logoPath = join(__dirname, '../../../assets/logo.png');

  async generateSolarReport(input: any, result: any): Promise<Buffer> {
    // Load the template PDF
    const templateBytes = readFileSync(this.templatePath);
    const pdfDoc = await PDFDocument.load(templateBytes);

    // Create a new PDF to overlay data
    const overlayPdf = await PDFDocument.create();
    const { width, height } = pdfDoc.getPage(0).getSize();
    const page = overlayPdf.addPage([width, height]);

    const draw = (text: string, x: number, y: number) => {
      page.drawText(text, { x, y, size: 10 });
    };

    // Cliente data (optional)
    draw(input.cliente?.nombre || '', 150, 632);
    draw(input.cliente?.ciudad || '', 150, 605);
    draw(input.cliente?.direccion || '', 150, 580);
    draw(input.cliente?.celular || '', 150, 550);
    draw(input.cliente?.email || '', 150, 525);

    // Sistema solar inputs
    draw(String(input.consumo_diario || ''), 230, 460);
    draw(String(input.voltaje_sistema || ''), 230, 430);
    draw(String(input.dias_autonomia || ''), 230, 405);
    draw(String(input.horas_sol_pico || ''), 230, 380);
    draw(String(input.voltaje_bateria || ''), 230, 345);
    draw(String(input.capacidad_bateria || ''), 230, 320);
    draw(String(input.profundidad_descarga || ''), 230, 293);
    draw(String(input.potencia_panel || ''), 230, 260);
    draw(String(input.potencia_pico || ''), 230, 235);

    // Resultados del cálculo
    draw(String(result.paneles_necesarios || ''), 460, 460);
    draw(String(result.capacidad_inversor || ''), 460, 430);
    draw(String(result.baterias_necesarias || ''), 460, 405);

    // Merge overlay onto template
    const overlayBytes = await overlayPdf.save();
    const finalPdf = await PDFDocument.load(templateBytes);
    const overlayDoc = await PDFDocument.load(overlayBytes);
    const [embeddedOverlayPage] = await finalPdf.embedPages([overlayDoc.getPages()[0]]);
    const firstPage = finalPdf.getPage(0);
    const { width: pWidth, height: pHeight } = firstPage.getSize();
    firstPage.drawPage(embeddedOverlayPage, {
      x: 0,
      y: 0,
      width: pWidth,
      height: pHeight,
    });

    return Buffer.from(await finalPdf.save());
  }
}
