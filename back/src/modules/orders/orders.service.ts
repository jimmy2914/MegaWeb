import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface OrderItemDto {
  productId: string;
  quantity: number;
}

export interface OrderEntity {
  id: string;
  userId: string;
  items: Array<{ productId: string; quantity: number; unitPrice: number; totalPrice: number }>;
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: string;
  paymentMethod: string;
  shippingAddress: {
    street: string;
    city: string;
    department: string;
    postalCode?: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, data: { items: Array<{ productId: string; quantity: number }>; paymentMethod: string; shippingAddress: OrderEntity['shippingAddress']; }) {
    // 1. Obtener información de precios de la BD
    const productIds = data.items.map((item) => item.productId);
    const dbProducts = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    let subtotal = 0;
    const orderItemsData = data.items.map((item) => {
      const dbProduct = dbProducts.find((p) => p.id === item.productId);
      if (!dbProduct) {
        throw new NotFoundException(`Product with ID ${item.productId} not found`);
      }
      const unitPrice = dbProduct.price;
      const totalPrice = unitPrice * item.quantity;
      subtotal += totalPrice;

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice,
        totalPrice,
      };
    });

    const tax = subtotal * 0.19; // 19% IVA Colombia
    const shipping = subtotal > 1500000 ? 0 : 50000; // Envío gratis para compras grandes
    const total = subtotal + tax + shipping;

    // 2. Crear la orden y los items en base de datos
    const dbOrder = await this.prisma.order.create({
      data: {
        userId,
        subtotal,
        tax,
        shipping,
        total,
        status: 'PENDING',
        paymentMethod: data.paymentMethod,
        shippingAddress: JSON.stringify(data.shippingAddress),
        items: {
          create: orderItemsData,
        },
      },
      include: {
        items: true,
      },
    });

    return this.mapToEntity(dbOrder);
  }

  async findAll(userId: string) {
    const dbOrders = await this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    const orders = dbOrders.map((o) => this.mapToEntity(o));
    return { orders, total: orders.length, page: 1, limit: orders.length };
  }

  async findOne(orderId: string) {
    const dbOrder = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!dbOrder) {
      throw new NotFoundException('Order not found');
    }
    return this.mapToEntity(dbOrder);
  }

  private mapToEntity(dbOrder: any): OrderEntity {
    let parsedAddress = { street: '', city: '', department: '', phone: '' };
    try {
      parsedAddress = JSON.parse(dbOrder.shippingAddress);
    } catch (e) {
      // Si no es JSON, devolver el string plano como dirección
      parsedAddress = { street: dbOrder.shippingAddress, city: '', department: '', phone: '' };
    }

    return {
      id: dbOrder.id,
      userId: dbOrder.userId,
      items: dbOrder.items.map((i: any) => ({
        productId: i.productId,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        totalPrice: i.totalPrice,
      })),
      subtotal: dbOrder.subtotal,
      tax: dbOrder.tax,
      shipping: dbOrder.shipping,
      total: dbOrder.total,
      status: dbOrder.status,
      paymentMethod: dbOrder.paymentMethod,
      shippingAddress: parsedAddress,
      createdAt: dbOrder.createdAt.toISOString(),
      updatedAt: dbOrder.updatedAt.toISOString(),
    };
  }
}
