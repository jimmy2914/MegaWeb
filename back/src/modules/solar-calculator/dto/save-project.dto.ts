import { IsNotEmpty, IsObject, IsString } from 'class-validator';

export class SaveProjectDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsString()
  description?: string;

  @IsObject()
  input: any;

  @IsObject()
  result: any;
}
