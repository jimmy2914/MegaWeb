import { IsArray, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateThreadDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsEnum(['OPEN', 'CLOSED', 'ANSWERED'])
  status?: 'OPEN' | 'CLOSED' | 'ANSWERED';
}
