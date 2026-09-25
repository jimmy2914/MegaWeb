import { OrdersController } from './orders.controller';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: { create: jest.Mock; findAll: jest.Mock; findOne: jest.Mock };
  const req = { user: { id: 'u1' } };

  beforeEach(() => {
    ordersService = { create: jest.fn(), findAll: jest.fn(), findOne: jest.fn() };
    controller = new OrdersController(ordersService as any);
  });

  it('create passes the user id and dto', () => {
    const dto = { paymentMethod: 'CARD', shippingAddress: {}, items: [] } as any;
    controller.create(req, dto);
    expect(ordersService.create).toHaveBeenCalledWith('u1', dto);
  });

  it('list returns the orders of the user', () => {
    controller.list(req);
    expect(ordersService.findAll).toHaveBeenCalledWith('u1');
  });

  it('getOne looks the order up by id', () => {
    controller.getOne('o1');
    expect(ordersService.findOne).toHaveBeenCalledWith('o1');
  });
});
