import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateProductDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsEnum(['COP', 'USD'])
  currency: 'COP' | 'USD';

  @IsEnum(['PANEL', 'INVERTER', 'BATTERY', 'SERVICE'])
  category: 'PANEL' | 'INVERTER' | 'BATTERY' | 'SERVICE';

  @IsArray()
  @IsString({ each: true })
  images: string[];

  @IsNumber()
  @Min(0)
  inventory: number;

  @IsOptional()
  featured?: boolean;
}
