import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: { register: jest.Mock; login: jest.Mock };
  let usersService: { updateProfile: jest.Mock; findAll: jest.Mock };

  beforeEach(() => {
    authService = { register: jest.fn().mockResolvedValue('registered'), login: jest.fn().mockResolvedValue('logged') };
    usersService = { updateProfile: jest.fn().mockResolvedValue('updated'), findAll: jest.fn().mockResolvedValue([{ id: 'u1' }]) };
    controller = new AuthController(authService as any, usersService as any);
  });

  it('register delegates to AuthService', async () => {
    const dto = { name: 'A', email: 'a@b.co', password: '12345678', role: 'CLIENT' as const };
    await expect(controller.register(dto)).resolves.toBe('registered');
    expect(authService.register).toHaveBeenCalledWith(dto);
  });

  it('login delegates to AuthService', async () => {
    const dto = { email: 'a@b.co', password: 'x' };
    await expect(controller.login(dto)).resolves.toBe('logged');
    expect(authService.login).toHaveBeenCalledWith(dto);
  });

  it('refresh echoes the refresh token', async () => {
    await expect(controller.refresh({ refreshToken: 'r' })).resolves.toEqual({
      accessToken: 'refresh-token-placeholder',
      refreshToken: 'r',
    });
  });

  it('profile returns the authenticated user', async () => {
    await expect(controller.profile({ user: { id: 'u1' } })).resolves.toEqual({ id: 'u1' });
  });

  it('updateProfile uses the authenticated user id', async () => {
    await expect(controller.updateProfile({ user: { id: 'u1' } }, { name: 'N' })).resolves.toBe('updated');
    expect(usersService.updateProfile).toHaveBeenCalledWith('u1', { name: 'N' });
  });

  it('listUsers wraps the users list', async () => {
    await expect(controller.listUsers()).resolves.toEqual({ users: [{ id: 'u1' }] });
  });
});
