import { NotFoundException } from '@nestjs/common';
import { ProductsService } from './products.service';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: { product: Record<string, jest.Mock> };

  const product = { id: 'p1', name: 'Panel', price: 100 };

  beforeEach(() => {
    prisma = {
      product: {
        count: jest.fn(),
        createMany: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ProductsService(prisma as any);
    jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => jest.restoreAllMocks());

  describe('onModuleInit', () => {
    it('seeds the initial catalog when the table is empty', async () => {
      prisma.product.count.mockResolvedValue(0);
      await service.onModuleInit();
      expect(prisma.product.createMany).toHaveBeenCalledTimes(1);
      const { data } = prisma.product.createMany.mock.calls[0][0];
      expect(data).toHaveLength(4);
      expect(data.map((p: { category: string }) => p.category).sort()).toEqual(['BATTERY', 'INVERTER', 'PANEL', 'SERVICE']);
    });

    it('does not seed when products already exist', async () => {
      prisma.product.count.mockResolvedValue(3);
      await service.onModuleInit();
      expect(prisma.product.createMany).not.toHaveBeenCalled();
    });
  });

  it('findAll wraps the items with pagination info', async () => {
    prisma.product.findMany.mockResolvedValue([product, { ...product, id: 'p2' }]);
    await expect(service.findAll()).resolves.toEqual({
      items: [product, { ...product, id: 'p2' }],
      total: 2,
      page: 1,
      limit: 2,
    });
  });

  describe('findOne', () => {
    it('returns the product', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      await expect(service.findOne('p1')).resolves.toEqual(product);
    });

    it('throws NotFoundException when missing', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.findOne('nope')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const base = {
      name: 'Inversor',
      description: 'desc',
      price: 10,
      currency: 'USD',
      category: 'INVERTER',
      images: ['a.png'],
      inventory: 5,
    };

    it('passes the given values through', async () => {
      prisma.product.create.mockImplementation(async ({ data }) => data);
      const created = await service.create({ ...base, featured: true });
      expect(created).toMatchObject({ ...base, featured: true });
    });

    it('applies defaults for currency, images, inventory and featured', async () => {
      prisma.product.create.mockImplementation(async ({ data }) => data);
      const created = await service.create({ ...base, currency: '', images: undefined as any, inventory: 0 });
      expect(created).toMatchObject({ currency: 'COP', images: [], inventory: 0, featured: false });
    });
  });

  describe('update', () => {
    it('updates an existing product', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      prisma.product.update.mockResolvedValue({ ...product, price: 200 });
      const updated = await service.update('p1', { price: 200 });
      expect(updated.price).toBe(200);
      expect(prisma.product.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'p1' } }));
    });

    it('throws NotFoundException and does not update when missing', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.update('nope', { price: 1 })).rejects.toThrow(NotFoundException);
      expect(prisma.product.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes an existing product', async () => {
      prisma.product.findUnique.mockResolvedValue(product);
      await expect(service.remove('p1')).resolves.toEqual({ success: true });
      expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    });

    it('throws NotFoundException when missing', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.remove('nope')).rejects.toThrow(NotFoundException);
      expect(prisma.product.delete).not.toHaveBeenCalled();
    });
  });
});
