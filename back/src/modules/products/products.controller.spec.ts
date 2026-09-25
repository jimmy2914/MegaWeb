import { ProductsController } from './products.controller';

describe('ProductsController', () => {
  let controller: ProductsController;
  let productsService: Record<'findAll' | 'findOne' | 'create' | 'update' | 'remove', jest.Mock>;

  beforeEach(() => {
    productsService = {
      findAll: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      remove: jest.fn(),
    };
    controller = new ProductsController(productsService as any);
  });

  it('list returns all products', () => {
    controller.list();
    expect(productsService.findAll).toHaveBeenCalled();
  });

  it('getOne looks a product up by id', () => {
    controller.getOne('p1');
    expect(productsService.findOne).toHaveBeenCalledWith('p1');
  });

  it('create forwards the dto', () => {
    const dto = { name: 'x' } as any;
    controller.create(dto);
    expect(productsService.create).toHaveBeenCalledWith(dto);
  });

  it('update forwards id and dto', () => {
    controller.update('p1', { price: 5 });
    expect(productsService.update).toHaveBeenCalledWith('p1', { price: 5 });
  });

  it('remove forwards the id', () => {
    controller.remove('p1');
    expect(productsService.remove).toHaveBeenCalledWith('p1');
  });
});
