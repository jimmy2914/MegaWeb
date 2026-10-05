import { PrismaService } from './prisma.service';

jest.mock('@prisma/client', () => ({
  PrismaClient: class {
    $connect = jest.fn().mockResolvedValue(undefined);
    $disconnect = jest.fn().mockResolvedValue(undefined);
  },
}));

describe('PrismaService', () => {
  it('connects when the module initializes', async () => {
    const service = new PrismaService();
    await service.onModuleInit();
    expect(service.$connect).toHaveBeenCalledTimes(1);
  });

  it('disconnects when the module is destroyed', async () => {
    const service = new PrismaService();
    await service.onModuleDestroy();
    expect(service.$disconnect).toHaveBeenCalledTimes(1);
  });
});
