import { PaymentsService } from './payments.service';

describe('PaymentsService', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('builds a payment session for the order and gateway', () => {
    const result = new PaymentsService().initiate('order-1', 'NEQUI');
    expect(result.paymentUrl).toBe('https://payment-gateway.example.com/order-1');
    expect(result.gateway).toBe('NEQUI');
    expect(result.paymentId).toBe(`pay_${Date.now()}`);
  });

  it('expires the payment 15 minutes after creation', () => {
    const result = new PaymentsService().initiate('order-1', 'CARD');
    expect(result.expiresAt).toBe('2026-01-01T00:15:00.000Z');
  });
});
