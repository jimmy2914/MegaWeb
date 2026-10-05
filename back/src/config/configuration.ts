export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  jwtSecret: process.env.JWT_SECRET || 'changeMe',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://user:password@localhost:5432/megaprojects',
});
