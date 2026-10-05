import { PaymentsController } from './payments.controller';

describe('PaymentsController', () => {
  it('initiate forwards the order id and gateway', () => {
    const paymentsService = { initiate: jest.fn().mockReturnValue({ paymentId: 'pay_1' }) };
    const controller = new PaymentsController(paymentsService as any);

    expect(controller.initiate({ orderId: 'o1', gateway: 'NEQUI' })).toEqual({ paymentId: 'pay_1' });
    expect(paymentsService.initiate).toHaveBeenCalledWith('o1', 'NEQUI');
  });
});
