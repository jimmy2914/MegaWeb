import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;
  let prisma: { product: { findUnique: jest.Mock } };

  const item = (id: string, quantity = 2, unitPrice = 100) => ({
    id,
    productId: `p-${id}`,
    quantity,
    unitPrice,
    totalPrice: quantity * unitPrice,
  });

  beforeEach(() => {
    prisma = {
      product: {
        findUnique: jest.fn(async ({ where }) => ({ id: where.id, name: `Producto ${where.id}`, inventory: 10 })),
      },
    };
    service = new CartService(prisma as any);
  });

  it('returns an empty cart for a new user', () => {
    expect(service.getCart('u1')).toEqual({ items: [], subtotal: 0 });
  });

  it('adds items and sums the subtotal', async () => {
    await service.addItem('u1', item('a', 2, 100));
    await service.addItem('u1', item('b', 1, 50));
    const cart = service.getCart('u1');
    expect(cart.items).toHaveLength(2);
    expect(cart.subtotal).toBe(250);
  });

  it('keeps carts separate per user', async () => {
    await service.addItem('u1', item('a'));
    expect(service.getCart('u2').items).toHaveLength(0);
  });

  describe('inventory validation on addItem', () => {
    it('rejects a quantity greater than the available inventory', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p-a', name: 'Panel', inventory: 3 });
      await expect(service.addItem('u1', item('a', 4))).rejects.toThrow(BadRequestException);
      expect(service.getCart('u1').items).toHaveLength(0);
    });

    it('rejects products that are out of stock', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p-a', name: 'Panel', inventory: 0 });
      await expect(service.addItem('u1', item('a', 1))).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException for an unknown product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.addItem('u1', item('a', 1))).rejects.toThrow(NotFoundException);
    });

    it('merges repeated products and validates the accumulated quantity', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'p-a', name: 'Panel', inventory: 5 });
      await service.addItem('u1', item('a', 3, 100));
      const merged = await service.addItem('u1', { ...item('a2', 2, 100), productId: 'p-a' });
      expect(service.getCart('u1').items).toHaveLength(1);
      expect(merged).toMatchObject({ id: 'a', quantity: 5, totalPrice: 500 });

      await expect(service.addItem('u1', { ...item('a3', 1, 100), productId: 'p-a' })).rejects.toThrow(BadRequestException);
      expect(service.getCart('u1').items[0].quantity).toBe(5);
    });
  });

  describe('updateItem', () => {
    it('updates quantity and recalculates the total', async () => {
      await service.addItem('u1', item('a', 2, 100));
      const updated = await service.updateItem('u1', 'a', 5);
      expect(updated.quantity).toBe(5);
      expect(updated.totalPrice).toBe(500);
    });

    it('rejects a quantity greater than the available inventory', async () => {
      await service.addItem('u1', item('a', 2, 100));
      await expect(service.updateItem('u1', 'a', 11)).rejects.toThrow(BadRequestException);
      expect(service.getCart('u1').items[0].quantity).toBe(2);
    });

    it('removes the item when quantity becomes 0', async () => {
      await service.addItem('u1', item('a'));
      await service.updateItem('u1', 'a', 0);
      expect(service.getCart('u1').items).toHaveLength(0);
    });

    it('throws NotFoundException for an unknown item', async () => {
      await expect(service.updateItem('u1', 'nope', 1)).rejects.toThrow(NotFoundException);
    });
  });

  it('removeItem deletes only the requested item', async () => {
    await service.addItem('u1', item('a'));
    await service.addItem('u1', item('b'));
    expect(service.removeItem('u1', 'a')).toEqual({ success: true });
    expect(service.getCart('u1').items.map((i) => i.id)).toEqual(['b']);
  });

  it('removeItem on an empty cart still succeeds', () => {
    expect(service.removeItem('u9', 'x')).toEqual({ success: true });
  });
});
