import { NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: { product: Record<string, jest.Mock>; order: Record<string, jest.Mock> };

  const address = { street: 'Calle 1', city: 'Villavicencio', department: 'Meta', phone: '300' };
  const now = new Date('2026-01-01T00:00:00.000Z');

  const dbOrder = (overrides: Record<string, unknown> = {}) => ({
    id: 'o1',
    userId: 'u1',
    subtotal: 100,
    tax: 19,
    shipping: 50000,
    total: 50119,
    status: 'PENDING',
    paymentMethod: 'CARD',
    shippingAddress: JSON.stringify(address),
    createdAt: now,
    updatedAt: now,
    items: [{ productId: 'p1', quantity: 1, unitPrice: 100, totalPrice: 100, id: 'ignored' }],
    ...overrides,
  });

  beforeEach(() => {
    prisma = {
      product: { findMany: jest.fn() },
      order: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    };
    service = new OrdersService(prisma as any);
  });

  describe('create', () => {
    it('charges 19% tax and flat shipping for small orders', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', price: 100000 }]);
      prisma.order.create.mockImplementation(async ({ data }) => dbOrder({ ...data, items: data.items.create }));

      await service.create('u1', { items: [{ productId: 'p1', quantity: 2 }], paymentMethod: 'CARD', shippingAddress: address });

      const { data } = prisma.order.create.mock.calls[0][0];
      expect(data.subtotal).toBe(200000);
      expect(data.tax).toBeCloseTo(38000);
      expect(data.shipping).toBe(50000);
      expect(data.total).toBeCloseTo(288000);
      expect(data.status).toBe('PENDING');
      expect(data.items.create).toEqual([{ productId: 'p1', quantity: 2, unitPrice: 100000, totalPrice: 200000 }]);
    });

    it('gives free shipping above 1,500,000', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', price: 2000000 }]);
      prisma.order.create.mockImplementation(async ({ data }) => dbOrder({ ...data, items: data.items.create }));

      await service.create('u1', { items: [{ productId: 'p1', quantity: 1 }], paymentMethod: 'PAGOS_PSE', shippingAddress: address });

      expect(prisma.order.create.mock.calls[0][0].data.shipping).toBe(0);
    });

    it('throws NotFoundException when a product does not exist', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      await expect(
        service.create('u1', { items: [{ productId: 'ghost', quantity: 1 }], paymentMethod: 'CARD', shippingAddress: address }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('returns the order mapped to the public entity', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', price: 100 }]);
      prisma.order.create.mockResolvedValue(dbOrder());
      const order = await service.create('u1', { items: [{ productId: 'p1', quantity: 1 }], paymentMethod: 'CARD', shippingAddress: address });
      expect(order).toEqual({
        id: 'o1',
        userId: 'u1',
        items: [{ productId: 'p1', quantity: 1, unitPrice: 100, totalPrice: 100 }],
        subtotal: 100,
        tax: 19,
        shipping: 50000,
        total: 50119,
        status: 'PENDING',
        paymentMethod: 'CARD',
        shippingAddress: address,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    });
  });

  it('findAll returns the mapped orders of a user', async () => {
    prisma.order.findMany.mockResolvedValue([dbOrder(), dbOrder({ id: 'o2' })]);
    const result = await service.findAll('u1');
    expect(prisma.order.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u1' } }));
    expect(result.total).toBe(2);
    expect(result.orders.map((o) => o.id)).toEqual(['o1', 'o2']);
  });

  describe('findOne', () => {
    it('returns the order', async () => {
      prisma.order.findUnique.mockResolvedValue(dbOrder());
      await expect(service.findOne('o1')).resolves.toMatchObject({ id: 'o1' });
    });

    it('throws NotFoundException when missing', async () => {
      prisma.order.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
    });

    it('keeps a plain-text address when it is not valid JSON', async () => {
      prisma.order.findUnique.mockResolvedValue(dbOrder({ shippingAddress: 'Carrera 5 #10' }));
      const order = await service.findOne('o1');
      expect(order.shippingAddress).toEqual({ street: 'Carrera 5 #10', city: '', department: '', phone: '' });
    });
  });
});
