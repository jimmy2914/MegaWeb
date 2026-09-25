import { ConflictException, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: { findByEmail: jest.Mock; create: jest.Mock };
  let jwtService: { sign: jest.Mock };

  const user = { id: 'u1', name: 'Ana', email: 'ana@test.com', password: 'hash', role: 'CLIENT' };

  beforeEach(() => {
    usersService = { findByEmail: jest.fn(), create: jest.fn() };
    jwtService = { sign: jest.fn((_payload: unknown, opts?: { expiresIn: string }) => (opts ? 'refresh-token' : 'access-token')) };
    service = new AuthService(usersService as any, jwtService as any);
    (bcrypt.compare as jest.Mock).mockReset();
  });

  describe('validateUser', () => {
    it('returns the user without the password when credentials match', async () => {
      usersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.validateUser(user.email, 'clave');
      expect(result).toEqual({ id: 'u1', name: 'Ana', email: 'ana@test.com', role: 'CLIENT' });
      expect(result).not.toHaveProperty('password');
    });

    it('returns null when the password is wrong', async () => {
      usersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.validateUser(user.email, 'mala')).resolves.toBeNull();
    });

    it('returns null when the user does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);
      await expect(service.validateUser('x@test.com', 'clave')).resolves.toBeNull();
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('throws Unauthorized when the account does not exist', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);
      await expect(service.login({ email: 'x@test.com', password: 'clave' })).rejects.toThrow(UnauthorizedException);
    });

    it('throws Unauthorized when the password is incorrect', async () => {
      usersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      await expect(service.login({ email: user.email, password: 'mala' })).rejects.toThrow('Contraseña incorrecta');
    });

    it('returns both tokens and a user without password on success', async () => {
      usersService.findByEmail.mockResolvedValue(user);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      const result = await service.login({ email: user.email, password: 'clave' });
      expect(result).toEqual({
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
        user: { id: 'u1', name: 'Ana', email: 'ana@test.com', role: 'CLIENT' },
      });
      expect(jwtService.sign).toHaveBeenCalledWith({ sub: 'u1', email: 'ana@test.com', role: 'CLIENT' }, { expiresIn: '7d' });
    });
  });

  describe('register', () => {
    const dto = { name: 'Ana', email: 'ana@test.com', password: 'clave12345', role: 'CLIENT' as const };

    it('throws Conflict when the email is already registered', async () => {
      usersService.findByEmail.mockResolvedValue(user);
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
      expect(usersService.create).not.toHaveBeenCalled();
    });

    it('creates the user and returns tokens', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);
      usersService.create.mockResolvedValue(user);
      const result = await service.register(dto);
      expect(usersService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        user: { id: 'u1', name: 'Ana', email: 'ana@test.com', role: 'CLIENT' },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });
    });

    it('maps a Prisma P2002 race condition to Conflict', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);
      usersService.create.mockRejectedValue({ code: 'P2002' });
      await expect(service.register(dto)).rejects.toThrow(ConflictException);
    });

    it('maps any other failure to InternalServerError', async () => {
      usersService.findByEmail.mockResolvedValue(undefined);
      usersService.create.mockRejectedValue(new Error('db down'));
      await expect(service.register(dto)).rejects.toThrow(InternalServerErrorException);
    });
  });
});
