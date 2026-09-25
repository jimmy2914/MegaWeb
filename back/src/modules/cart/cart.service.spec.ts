import { NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';

describe('CartService', () => {
  let service: CartService;

  const item = (id: string, quantity = 2, unitPrice = 100) => ({
    id,
    productId: `p-${id}`,
    quantity,
    unitPrice,
    totalPrice: quantity * unitPrice,
  });

  beforeEach(() => {
    service = new CartService();
  });

  it('returns an empty cart for a new user', () => {
    expect(service.getCart('u1')).toEqual({ items: [], subtotal: 0 });
  });

  it('adds items and sums the subtotal', () => {
    service.addItem('u1', item('a', 2, 100));
    service.addItem('u1', item('b', 1, 50));
    const cart = service.getCart('u1');
    expect(cart.items).toHaveLength(2);
    expect(cart.subtotal).toBe(250);
  });

  it('keeps carts separate per user', () => {
    service.addItem('u1', item('a'));
    expect(service.getCart('u2').items).toHaveLength(0);
  });

  describe('updateItem', () => {
    it('updates quantity and recalculates the total', () => {
      service.addItem('u1', item('a', 2, 100));
      const updated = service.updateItem('u1', 'a', 5);
      expect(updated.quantity).toBe(5);
      expect(updated.totalPrice).toBe(500);
    });

    it('removes the item when quantity becomes 0', () => {
      service.addItem('u1', item('a'));
      service.updateItem('u1', 'a', 0);
      expect(service.getCart('u1').items).toHaveLength(0);
    });

    it('throws NotFoundException for an unknown item', () => {
      expect(() => service.updateItem('u1', 'nope', 1)).toThrow(NotFoundException);
    });
  });

  it('removeItem deletes only the requested item', () => {
    service.addItem('u1', item('a'));
    service.addItem('u1', item('b'));
    expect(service.removeItem('u1', 'a')).toEqual({ success: true });
    expect(service.getCart('u1').items.map((i) => i.id)).toEqual(['b']);
  });

  it('removeItem on an empty cart still succeeds', () => {
    expect(service.removeItem('u9', 'x')).toEqual({ success: true });
  });
});
