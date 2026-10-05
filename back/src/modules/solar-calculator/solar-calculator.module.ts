import { Module } from '@nestjs/common';
import { SolarCalculatorController } from './solar-calculator.controller';
import { SolarCalculatorService } from './solar-calculator.service';
import { PdfService } from '../../common/services/pdf.service';

@Module({
  controllers: [SolarCalculatorController],
  providers: [SolarCalculatorService, PdfService],
})
export class SolarCalculatorModule {}
