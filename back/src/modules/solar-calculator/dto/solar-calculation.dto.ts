import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsObject, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto {
  @IsNotEmpty()
  @IsString()
  city: string;

  @IsNotEmpty()
  @IsString()
  department: string;

  @IsNumber()
  latitude: number;

  @IsNumber()
  longitude: number;
}

export class SolarCalculationInputDto {
  @IsObject()
  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsNumber()
  averageDailyConsumptionKWh: number;

  @IsNumber()
  peakPowerDemandKw: number;

  @IsNotEmpty()
  @IsString()
  panelType: string;

  @IsNumber()
  panelEfficiency: number;

  @IsNumber()
  inverterEfficiency: number;

  @IsNumber()
  systemLossesPercentage: number;

  @IsNumber()
  tiltAngle: number;

  @IsEnum(['NORTE', 'SUR', 'ESTE', 'OESTE'])
  orientation: 'NORTE' | 'SUR' | 'ESTE' | 'OESTE';

  @IsOptional()
  @IsNumber()
  budgetCOP?: number;

  @IsOptional()
  @IsNumber()
  consumo_diario?: number;

  @IsOptional()
  @IsNumber()
  voltaje_sistema?: number;

  @IsOptional()
  @IsNumber()
  dias_autonomia?: number;

  @IsOptional()
  @IsNumber()
  horas_sol_pico?: number;

  @IsOptional()
  @IsNumber()
  voltaje_bateria?: number;

  @IsOptional()
  @IsNumber()
  capacidad_bateria?: number;

  @IsOptional()
  @IsNumber()
  profundidad_descarga?: number;

  @IsOptional()
  @IsNumber()
  potencia_panel?: number;

  @IsOptional()
  @IsNumber()
  potencia_pico?: number;
}
