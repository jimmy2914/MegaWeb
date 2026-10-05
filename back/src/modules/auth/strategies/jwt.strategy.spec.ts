import { JwtStrategy } from './jwt.strategy';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: { findById: jest.Mock };

  beforeEach(() => {
    usersService = { findById: jest.fn() };
    const config = { get: jest.fn().mockReturnValue('test-secret') };
    strategy = new JwtStrategy(config as any, usersService as any);
  });

  it('returns the user without the password when the token subject exists', async () => {
    usersService.findById.mockResolvedValue({ id: 'u1', email: 'a@b.co', password: 'hash', role: 'ADMIN' });
    const result = await strategy.validate({ sub: 'u1' });
    expect(usersService.findById).toHaveBeenCalledWith('u1');
    expect(result).toEqual({ id: 'u1', email: 'a@b.co', role: 'ADMIN' });
  });

  it('returns null when the user no longer exists', async () => {
    usersService.findById.mockResolvedValue(undefined);
    await expect(strategy.validate({ sub: 'gone' })).resolves.toBeNull();
  });
});
