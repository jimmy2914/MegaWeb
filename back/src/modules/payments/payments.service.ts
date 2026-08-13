import { Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
  initiate(orderId: string, gateway: string) {
    return {
      paymentUrl: `https://payment-gateway.example.com/${orderId}`,
      paymentId: `pay_${Date.now()}`,
      expiresAt: new Date(Date.now() + 1000 * 60 * 15).toISOString(),
      gateway,
    };
  }
}
