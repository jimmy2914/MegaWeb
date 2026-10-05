import { NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

jest.mock('bcrypt', () => ({
  hash: jest.fn(async (value: string) => `hashed:${value}`),
}));

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: Record<string, jest.Mock> };

  const user = { id: 'u1', name: 'Ana', email: 'ana@test.com', password: 'hashed', role: 'CLIENT' };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };
    service = new UsersService(prisma as any);
  });

  it('findByEmail returns the user when it exists', async () => {
    prisma.user.findUnique.mockResolvedValue(user);
    await expect(service.findByEmail('ana@test.com')).resolves.toEqual(user);
    expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { email: 'ana@test.com' } });
  });

  it('findByEmail returns undefined when there is no user', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.findByEmail('x@test.com')).resolves.toBeUndefined();
  });

  it('findById returns the user or undefined', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(user).mockResolvedValueOnce(null);
    await expect(service.findById('u1')).resolves.toEqual(user);
    await expect(service.findById('nope')).resolves.toBeUndefined();
  });

  it('findAll delegates to prisma', async () => {
    prisma.user.findMany.mockResolvedValue([user]);
    await expect(service.findAll()).resolves.toEqual([user]);
  });

  it('create hashes the password and applies the given fields', async () => {
    prisma.user.create.mockImplementation(async ({ data }) => ({ id: 'u2', ...data }));
    const created = await service.create({ name: 'Luis', email: 'luis@test.com', password: 'secreto123', role: 'FORUM_USER' });
    expect(bcrypt.hash).toHaveBeenCalledWith('secreto123', 10);
    expect(created).toMatchObject({ name: 'Luis', email: 'luis@test.com', password: 'hashed:secreto123', role: 'FORUM_USER' });
  });

  it('create falls back to defaults when the payload is empty', async () => {
    prisma.user.create.mockImplementation(async ({ data }) => data);
    const created = await service.create({});
    expect(created).toEqual({
      name: 'Unnamed',
      email: 'unknown@megaworld.com',
      password: 'hashed:changeme',
      role: 'CLIENT',
    });
  });

  describe('updateProfile', () => {
    it('throws NotFoundException when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.updateProfile('nope', { name: 'X' })).rejects.toThrow(NotFoundException);
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('updates name and hashes the new password', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue({ ...user, name: 'Nuevo' });
      await service.updateProfile('u1', { name: 'Nuevo', password: 'otraClave1' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: { name: 'Nuevo', password: 'hashed:otraClave1' },
      });
    });

    it('sends an empty update when no fields are provided', async () => {
      prisma.user.findUnique.mockResolvedValue(user);
      prisma.user.update.mockResolvedValue(user);
      await service.updateProfile('u1', {});
      expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 'u1' }, data: {} });
    });
  });
});
