import { Controller, Post, Get, Param, Body, Request, UseGuards, Res } from '@nestjs/common';
import { SolarCalculatorService } from './solar-calculator.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ExportPdfDto } from './dto/export-pdf.dto';
import { Response } from 'express';

@Controller('solar')
export class SolarCalculatorController {
  constructor(private solarService: SolarCalculatorService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('calculate')
  calculate(@Body() dto: any) {
    return this.solarService.calculate(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post('export-pdf')
  async exportPdf(@Body() dto: ExportPdfDto, @Res() res: Response) {
    const pdfBuffer = await this.solarService.exportPdf(dto);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename=reporte_solar.pdf',
      'Content-Length': pdfBuffer.length.toString(),
    });
    res.end(pdfBuffer);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  @Post('projects')
  saveProject(@Request() req: { user: { id: string } }, @Body() dto: any) {
    return this.solarService.saveProject(req.user.id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  @Get('projects')
  listProjects(@Request() req: { user: { id: string } }) {
    return this.solarService.listProjects(req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  @Get('projects/:id')
  getProject(@Param('id') id: string) {
    return this.solarService.getProject(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CLIENT')
  @Post('projects/:id/delete')
  deleteProject(@Param('id') id: string) {
    return this.solarService.deleteProject(id);
  }
}
