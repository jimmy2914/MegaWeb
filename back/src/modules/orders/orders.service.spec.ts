import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: { product: Record<string, jest.Mock>; order: Record<string, jest.Mock>; $transaction: jest.Mock };

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
      product: { findMany: jest.fn(), updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
      order: { create: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(async (fn) => fn(prisma));
    service = new OrdersService(prisma as any);
  });

  describe('create', () => {
    it('charges 19% tax and flat shipping for small orders', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Panel', price: 100000, inventory: 10 }]);
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
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Panel', price: 2000000, inventory: 10 }]);
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

    it('decrements the inventory of each ordered product', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Panel', price: 100, inventory: 10 }]);
      prisma.order.create.mockImplementation(async ({ data }) => dbOrder({ ...data, items: data.items.create }));

      await service.create('u1', { items: [{ productId: 'p1', quantity: 3 }], paymentMethod: 'CARD', shippingAddress: address });

      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'p1', inventory: { gte: 3 } },
        data: { inventory: { decrement: 3 } },
      });
    });

    it('adds up repeated products before validating and decrementing', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Panel', price: 100, inventory: 4 }]);
      await expect(
        service.create('u1', {
          items: [{ productId: 'p1', quantity: 3 }, { productId: 'p1', quantity: 2 }],
          paymentMethod: 'CARD',
          shippingAddress: address,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.product.updateMany).not.toHaveBeenCalled();
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('rejects the order when inventory is insufficient', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Panel', price: 100, inventory: 1 }]);
      await expect(
        service.create('u1', { items: [{ productId: 'p1', quantity: 2 }], paymentMethod: 'CARD', shippingAddress: address }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.product.updateMany).not.toHaveBeenCalled();
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('rejects the order if the stock was consumed concurrently', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Panel', price: 100, inventory: 5 }]);
      prisma.product.updateMany.mockResolvedValue({ count: 0 });
      await expect(
        service.create('u1', { items: [{ productId: 'p1', quantity: 2 }], paymentMethod: 'CARD', shippingAddress: address }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.order.create).not.toHaveBeenCalled();
    });

    it('rejects empty orders and non-positive quantities', async () => {
      await expect(service.create('u1', { items: [], paymentMethod: 'CARD', shippingAddress: address })).rejects.toThrow(BadRequestException);
      await expect(
        service.create('u1', { items: [{ productId: 'p1', quantity: -1 }], paymentMethod: 'CARD', shippingAddress: address }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('returns the order mapped to the public entity', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'p1', name: 'Panel', price: 100, inventory: 10 }]);
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
