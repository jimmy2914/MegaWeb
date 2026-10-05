import { IsEnum, IsNotEmpty } from 'class-validator';

export class InitiatePaymentDto {
  @IsNotEmpty()
  orderId: string;

  @IsEnum(['PAGOS_PSE', 'CARD', 'NEQUI', 'BALOTO'])
  gateway: 'PAGOS_PSE' | 'CARD' | 'NEQUI' | 'BALOTO';
}
