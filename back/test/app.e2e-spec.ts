import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request = require('supertest');
import * as bcrypt from 'bcrypt';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Pruebas de integración (e2e) de la API contra la base de datos de pruebas
 * `megaprojects_test` (ver back/.env.test). NUNCA se ejecutan contra la base
 * de datos real `megaprojects`.
 */
describe('MegaWeb API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const API = '/api/v1';

  const adminCreds = { email: `admin.e2e.${Date.now()}@test.com`, password: 'AdminPass123' };
  const clientCreds = { email: `cliente.e2e.${Date.now()}@test.com`, password: 'ClientePass123' };

  let clientToken: string;
  let adminToken: string;
  let seededProductId: string;

  beforeAll(async () => {
    expect(process.env.DATABASE_URL).toContain('megaprojects_test');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
    );
    await app.init();

    prisma = app.get(PrismaService);

    // Limpieza de la base de datos de pruebas antes de sembrar datos (orden por FKs).
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.post.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.category.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();

    // Usuario ADMIN sembrado directamente (el registro público no permite el rol ADMIN).
    await prisma.user.create({
      data: {
        name: 'Admin E2E',
        email: adminCreds.email,
        password: await bcrypt.hash(adminCreds.password, 10),
        role: 'ADMIN',
      },
    });

    // Producto de referencia para las pruebas de pedidos.
    const product = await prisma.product.create({
      data: {
        name: 'Panel solar 400W (e2e)',
        description: 'Producto sembrado para pruebas de integración',
        price: 100000,
        currency: 'COP',
        category: 'PANEL',
        images: [],
        inventory: 50,
      },
    });
    seededProductId = product.id;
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.post.deleteMany();
    await prisma.thread.deleteMany();
    await prisma.category.deleteMany();
    await prisma.product.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('1. Login', () => {
    it('registra un cliente y el login con credenciales válidas devuelve un token', async () => {
      const registerRes = await request(app.getHttpServer())
        .post(`${API}/auth/register`)
        .send({ name: 'Cliente E2E', email: clientCreds.email, password: clientCreds.password, role: 'CLIENT' });
      expect(registerRes.status).toBe(201);

      const loginRes = await request(app.getHttpServer())
        .post(`${API}/auth/login`)
        .send({ email: clientCreds.email, password: clientCreds.password });

      expect(loginRes.status).toBe(201);
      expect(loginRes.body).toHaveProperty('accessToken');
      expect(typeof loginRes.body.accessToken).toBe('string');
      expect(loginRes.body.user).toMatchObject({ email: clientCreds.email, role: 'CLIENT' });

      clientToken = loginRes.body.accessToken;
    });

    it('login con credenciales inválidas devuelve 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/auth/login`)
        .send({ email: clientCreds.email, password: 'clave-incorrecta' });

      expect(res.status).toBe(401);
    });

    it('obtiene el token de administrador para el resto de las pruebas', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/auth/login`)
        .send({ email: adminCreds.email, password: adminCreds.password });

      expect(res.status).toBe(201);
      adminToken = res.body.accessToken;
    });
  });

  describe('2. Endpoint protegido sin token', () => {
    it('GET /auth/profile sin Authorization devuelve 401', async () => {
      const res = await request(app.getHttpServer()).get(`${API}/auth/profile`);
      expect(res.status).toBe(401);
    });
  });

  describe('3. Ruta de administrador sin rol ADMIN', () => {
    it('GET /auth/users con un token de CLIENT devuelve 403', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/auth/users`)
        .set('Authorization', `Bearer ${clientToken}`);
      expect(res.status).toBe(403);
    });

    it('GET /auth/users con un token de ADMIN devuelve 200', async () => {
      const res = await request(app.getHttpServer())
        .get(`${API}/auth/users`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(200);
    });
  });

  describe('4. Crear pedido: subtotal, IVA 19% y envío', () => {
    it('calcula subtotal, IVA del 19% y envío fijo para una compra pequeña', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/orders`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          paymentMethod: 'CARD',
          shippingAddress: { street: 'Calle 1 # 2-3', city: 'Villavicencio', department: 'Meta', phone: '3000000000' },
          items: [{ productId: seededProductId, quantity: 2 }],
        });

      expect(res.status).toBe(201);
      expect(res.body.subtotal).toBe(200000); // 100000 * 2
      expect(res.body.tax).toBeCloseTo(38000); // 19% de 200000
      expect(res.body.shipping).toBe(50000); // por debajo del umbral de envío gratis
      expect(res.body.total).toBeCloseTo(288000); // subtotal + iva + envío
    });

    it('aplica envío gratis por encima de 1.500.000', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/orders`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send({
          paymentMethod: 'CARD',
          shippingAddress: { street: 'Calle 1 # 2-3', city: 'Villavicencio', department: 'Meta', phone: '3000000000' },
          items: [{ productId: seededProductId, quantity: 20 }], // 20 * 100000 = 2.000.000
        });

      expect(res.status).toBe(201);
      expect(res.body.subtotal).toBe(2000000);
      expect(res.body.shipping).toBe(0);
      expect(res.body.tax).toBeCloseTo(380000);
      expect(res.body.total).toBeCloseTo(2380000);
    });
  });

  describe('5. Crear hilo del foro sin autenticación', () => {
    it('POST /forum/threads sin token es rechazado con 401', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/forum/threads`)
        .send({ title: 'Hilo sin autenticación', categoryId: 'general', content: 'Contenido' });

      expect(res.status).toBe(401);
    });
  });

  describe('6. Exportar PDF de la calculadora solar', () => {
    const solarInput = {
      location: { city: 'Villavicencio', department: 'Meta', latitude: 4.15, longitude: -73.63 },
      averageDailyConsumptionKWh: 5,
      peakPowerDemandKw: 1.5,
      panelType: 'Monocristalino',
      panelEfficiency: 0.2,
      inverterEfficiency: 0.9,
      systemLossesPercentage: 10,
      tiltAngle: 10,
      orientation: 'SUR',
      consumo_diario: 5000,
      voltaje_sistema: 24,
      dias_autonomia: 1,
      horas_sol_pico: 4,
      voltaje_bateria: 12,
      capacidad_bateria: 150,
      profundidad_descarga: 50,
      potencia_panel: 400,
      potencia_pico: 1500,
    };

    it('un ADMIN puede exportar el PDF y recibe application/pdf', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/solar/export-pdf`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(solarInput);

      expect(res.status).toBe(201);
      expect(res.headers['content-type']).toContain('application/pdf');
    });

    it('un CLIENT no puede exportar el PDF (403)', async () => {
      const res = await request(app.getHttpServer())
        .post(`${API}/solar/export-pdf`)
        .set('Authorization', `Bearer ${clientToken}`)
        .send(solarInput);

      expect(res.status).toBe(403);
    });

    it('sin token no puede exportar el PDF (401)', async () => {
      const res = await request(app.getHttpServer()).post(`${API}/solar/export-pdf`).send(solarInput);
      expect(res.status).toBe(401);
    });
  });
});
