import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { LoginDto } from './auth/dto/login.dto';
import { RegisterDto } from './auth/dto/register.dto';
import { UpdateProfileDto } from './auth/dto/update-profile.dto';
import { AddCartItemDto } from './cart/dto/add-cart-item.dto';
import { UpdateCartItemDto } from './cart/dto/update-cart-item.dto';
import { CreateKnowledgeArticleDto } from './forum/dto/create-article.dto';
import { CreatePostDto } from './forum/dto/create-post.dto';
import { CreateThreadDto } from './forum/dto/create-thread.dto';
import { ReactPostDto } from './forum/dto/react-post.dto';
import { UpdateThreadDto } from './forum/dto/update-thread.dto';
import { CreateOrderDto } from './orders/dto/create-order.dto';
import { InitiatePaymentDto } from './payments/dto/initiate-payment.dto';
import { CreateProductDto } from './products/dto/create-product.dto';
import { UpdateProductDto } from './products/dto/update-product.dto';
import { ExportPdfDto } from './solar-calculator/dto/export-pdf.dto';
import { SaveProjectDto } from './solar-calculator/dto/save-project.dto';
import { SolarCalculationInputDto } from './solar-calculator/dto/solar-calculation.dto';

type Ctor<T> = new () => T;

async function errorsFor<T extends object>(cls: Ctor<T>, plain: Record<string, unknown>) {
  const errors = await validate(plainToInstance(cls, plain));
  return errors.map((e) => e.property);
}

describe('DTO validation', () => {
  describe('auth', () => {
    it('LoginDto accepts valid credentials and rejects a bad email', async () => {
      expect(await errorsFor(LoginDto, { email: 'a@b.co', password: 'x' })).toEqual([]);
      expect(await errorsFor(LoginDto, { email: 'nope', password: 'x' })).toEqual(['email']);
    });

    it('RegisterDto enforces password length and allowed roles', async () => {
      const ok = { name: 'Ana', email: 'a@b.co', password: '12345678', role: 'CLIENT' };
      expect(await errorsFor(RegisterDto, ok)).toEqual([]);
      expect(await errorsFor(RegisterDto, { ...ok, password: 'short' })).toEqual(['password']);
      expect(await errorsFor(RegisterDto, { ...ok, role: 'ADMIN' })).toEqual(['role']);
    });

    it('UpdateProfileDto is fully optional but validates provided fields', async () => {
      expect(await errorsFor(UpdateProfileDto, {})).toEqual([]);
      expect(await errorsFor(UpdateProfileDto, { password: 'short' })).toEqual(['password']);
    });
  });

  describe('cart', () => {
    it('AddCartItemDto requires quantity >= 1 and non-negative price', async () => {
      expect(await errorsFor(AddCartItemDto, { productId: 'p', quantity: 1, unitPrice: 0 })).toEqual([]);
      expect(await errorsFor(AddCartItemDto, { productId: 'p', quantity: 0, unitPrice: -1 })).toEqual(['quantity', 'unitPrice']);
    });

    it('UpdateCartItemDto allows 0 but not negatives', async () => {
      expect(await errorsFor(UpdateCartItemDto, { quantity: 0 })).toEqual([]);
      expect(await errorsFor(UpdateCartItemDto, { quantity: -1 })).toEqual(['quantity']);
    });
  });

  describe('payments and orders', () => {
    it('InitiatePaymentDto only accepts known gateways', async () => {
      expect(await errorsFor(InitiatePaymentDto, { orderId: 'o1', gateway: 'NEQUI' })).toEqual([]);
      expect(await errorsFor(InitiatePaymentDto, { orderId: 'o1', gateway: 'PAYPAL' })).toEqual(['gateway']);
    });

    it('CreateOrderDto validates nested address and items', async () => {
      const ok = {
        paymentMethod: 'CARD',
        shippingAddress: { street: 's', city: 'c', department: 'd', phone: '3' },
        items: [{ productId: 'p1', quantity: 2 }],
      };
      expect(await errorsFor(CreateOrderDto, ok)).toEqual([]);
      expect(await errorsFor(CreateOrderDto, { ...ok, shippingAddress: { street: 's' } })).toEqual(['shippingAddress']);
      expect(await errorsFor(CreateOrderDto, { ...ok, items: [{ quantity: 'x' }] })).toEqual(['items']);
    });
  });

  describe('products', () => {
    const ok = { name: 'n', description: 'd', price: 1, currency: 'COP', category: 'PANEL', images: ['a.png'], inventory: 1 };

    it('CreateProductDto validates enums, numbers and images', async () => {
      expect(await errorsFor(CreateProductDto, ok)).toEqual([]);
      expect((await errorsFor(CreateProductDto, { ...ok, currency: 'EUR', category: 'X', price: -1 })).sort()).toEqual(
        ['category', 'currency', 'price'],
      );
      expect(await errorsFor(CreateProductDto, { ...ok, images: [1] })).toEqual(['images']);
    });

    it('UpdateProductDto accepts partial updates', async () => {
      expect(await errorsFor(UpdateProductDto, {})).toEqual([]);
      expect(await errorsFor(UpdateProductDto, { price: 5, inventory: 2, featured: true })).toEqual([]);
      expect(await errorsFor(UpdateProductDto, { category: 'NOPE' })).toEqual(['category']);
    });
  });

  describe('forum', () => {
    it('CreateThreadDto requires title, category and content', async () => {
      expect(await errorsFor(CreateThreadDto, { title: 't', categoryId: 'c', content: 'x', tags: ['a'] })).toEqual([]);
      expect((await errorsFor(CreateThreadDto, {})).sort()).toEqual(['categoryId', 'content', 'title']);
    });

    it('UpdateThreadDto validates the status enum', async () => {
      expect(await errorsFor(UpdateThreadDto, { status: 'ANSWERED' })).toEqual([]);
      expect(await errorsFor(UpdateThreadDto, { status: 'DELETED' })).toEqual(['status']);
    });

    it('CreatePostDto requires content', async () => {
      expect(await errorsFor(CreatePostDto, { content: 'hola' })).toEqual([]);
      expect(await errorsFor(CreatePostDto, { content: '' })).toEqual(['content']);
    });

    it('ReactPostDto only accepts known reactions', async () => {
      expect(await errorsFor(ReactPostDto, { type: 'LOVE' })).toEqual([]);
      expect(await errorsFor(ReactPostDto, { type: 'HATE' })).toEqual(['type']);
    });

    it('CreateKnowledgeArticleDto requires its text fields', async () => {
      expect(await errorsFor(CreateKnowledgeArticleDto, { title: 't', summary: 's', content: 'c', category: 'k' })).toEqual([]);
      expect(await errorsFor(CreateKnowledgeArticleDto, { title: 't' })).toEqual(['summary', 'content', 'category']);
    });
  });

  describe('solar calculator', () => {
    const ok = {
      location: { city: 'Villavicencio', department: 'Meta', latitude: 4.1, longitude: -73.6 },
      averageDailyConsumptionKWh: 10,
      peakPowerDemandKw: 3,
      panelType: 'MONO',
      panelEfficiency: 0.2,
      inverterEfficiency: 0.95,
      systemLossesPercentage: 10,
      tiltAngle: 15,
      orientation: 'SUR',
    };

    it('SolarCalculationInputDto accepts a complete input', async () => {
      expect(await errorsFor(SolarCalculationInputDto, ok)).toEqual([]);
    });

    it('SolarCalculationInputDto rejects invalid orientation and location', async () => {
      expect(await errorsFor(SolarCalculationInputDto, { ...ok, orientation: 'ARRIBA' })).toEqual(['orientation']);
      expect(await errorsFor(SolarCalculationInputDto, { ...ok, location: { city: 'x' } })).toEqual(['location']);
    });

    it('ExportPdfDto extends the calculation input with an optional client', async () => {
      expect(await errorsFor(ExportPdfDto, { ...ok, cliente: { nombre: 'A' } })).toEqual([]);
      expect(await errorsFor(ExportPdfDto, { ...ok, cliente: 'texto' })).toEqual(['cliente']);
    });

    it('SaveProjectDto requires name, input and result', async () => {
      expect(await errorsFor(SaveProjectDto, { name: 'p', description: 'd', input: {}, result: {} })).toEqual([]);
      expect((await errorsFor(SaveProjectDto, {})).sort()).toEqual(['description', 'input', 'name', 'result']);
    });
  });
});
