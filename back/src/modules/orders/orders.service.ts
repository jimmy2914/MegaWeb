import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
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
    if (!data.items?.length) {
      throw new BadRequestException('Order must contain at least one item');
    }

    // Agrupar cantidades por producto por si el mismo producto viene repetido
    const quantities = new Map<string, number>();
    for (const item of data.items) {
      if (!Number.isInteger(item.quantity) || item.quantity < 1) {
        throw new BadRequestException(`Invalid quantity for product ${item.productId}`);
      }
      quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
    }

    const dbOrder = await this.prisma.$transaction(async (tx) => {
      // 1. Obtener información de precios e inventario de la BD
      const dbProducts = await tx.product.findMany({
        where: { id: { in: [...quantities.keys()] } },
      });

      let subtotal = 0;
      const orderItemsData = data.items.map((item) => {
        const dbProduct = dbProducts.find((p) => p.id === item.productId);
        if (!dbProduct) {
          throw new NotFoundException(`Product with ID ${item.productId} not found`);
        }
        const requested = quantities.get(item.productId)!;
        if (requested > dbProduct.inventory) {
          throw new BadRequestException(
            `Inventario insuficiente para ${dbProduct.name}: solicitaste ${requested} y hay ${dbProduct.inventory} disponibles`,
          );
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

      // 2. Descontar inventario. La condición `gte` evita dejar stock negativo
      //    si otro pedido concurrente consumió las unidades entre la lectura y la escritura.
      for (const [productId, quantity] of quantities) {
        const { count } = await tx.product.updateMany({
          where: { id: productId, inventory: { gte: quantity } },
          data: { inventory: { decrement: quantity } },
        });
        if (count === 0) {
          const name = dbProducts.find((p) => p.id === productId)?.name ?? productId;
          throw new BadRequestException(`Inventario insuficiente para ${name}: otro pedido acaba de reservar las unidades`);
        }
      }

      const tax = subtotal * 0.19; // 19% IVA Colombia
      const shipping = subtotal > 1500000 ? 0 : 50000; // Envío gratis para compras grandes
      const total = subtotal + tax + shipping;

      // 3. Crear la orden y los items en base de datos
      return tx.order.create({
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
