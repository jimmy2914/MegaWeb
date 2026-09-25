import configuration from './configuration';

describe('configuration', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it('uses defaults when no environment variables are set', () => {
    delete process.env.PORT;
    delete process.env.JWT_SECRET;
    delete process.env.JWT_EXPIRES_IN;
    delete process.env.DATABASE_URL;
    expect(configuration()).toEqual({
      port: 3000,
      jwtSecret: 'changeMe',
      jwtExpiresIn: '1h',
      databaseUrl: 'postgresql://user:password@localhost:5432/megaprojects',
    });
  });

  it('reads values from the environment', () => {
    process.env.PORT = '4000';
    process.env.JWT_SECRET = 's3cret';
    process.env.JWT_EXPIRES_IN = '2h';
    process.env.DATABASE_URL = 'postgresql://x';
    expect(configuration()).toEqual({ port: 4000, jwtSecret: 's3cret', jwtExpiresIn: '2h', databaseUrl: 'postgresql://x' });
  });
});
