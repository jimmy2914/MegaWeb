import { IsOptional, IsObject } from 'class-validator';
import { SolarCalculationInputDto } from './solar-calculation.dto';

export class ExportPdfDto extends SolarCalculationInputDto {
  @IsOptional()
  @IsObject()
  cliente?: any;
}
