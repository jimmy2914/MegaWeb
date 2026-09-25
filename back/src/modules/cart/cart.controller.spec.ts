import { CartController } from './cart.controller';

describe('CartController', () => {
  let controller: CartController;
  let cartService: { getCart: jest.Mock; addItem: jest.Mock; updateItem: jest.Mock; removeItem: jest.Mock };
  const req = { user: { id: 'u1' } };

  beforeEach(() => {
    cartService = { getCart: jest.fn(), addItem: jest.fn(), updateItem: jest.fn(), removeItem: jest.fn() };
    controller = new CartController(cartService as any);
  });

  it('getCart reads the cart of the authenticated user', () => {
    controller.getCart(req);
    expect(cartService.getCart).toHaveBeenCalledWith('u1');
  });

  it('addItem computes the total price from quantity and unit price', () => {
    controller.addItem(req, { productId: 'p1', quantity: 3, unitPrice: 200 });
    expect(cartService.addItem).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ productId: 'p1', quantity: 3, unitPrice: 200, totalPrice: 600 }),
    );
  });

  it('updateItem forwards the new quantity', () => {
    controller.updateItem(req, 'i1', { quantity: 4 });
    expect(cartService.updateItem).toHaveBeenCalledWith('u1', 'i1', 4);
  });

  it('removeItem forwards the item id', () => {
    controller.removeItem(req, 'i1');
    expect(cartService.removeItem).toHaveBeenCalledWith('u1', 'i1');
  });
});
