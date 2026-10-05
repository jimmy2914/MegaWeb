import { IsArray, IsEnum, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @IsOptional()
  @IsEnum(['COP', 'USD'])
  currency?: 'COP' | 'USD';

  @IsOptional()
  @IsEnum(['PANEL', 'INVERTER', 'BATTERY', 'SERVICE'])
  category?: 'PANEL' | 'INVERTER' | 'BATTERY' | 'SERVICE';

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsNumber()
  @Min(0)
  inventory?: number;

  @IsOptional()
  featured?: boolean;
}
