import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface CartItemEntity {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

@Injectable()
export class CartService {
  private carts: Record<string, CartItemEntity[]> = {};

  constructor(private prisma: PrismaService) {}

  getCart(userId: string) {
    const items = this.carts[userId] || [];
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    return { items, subtotal };
  }

  async addItem(userId: string, item: CartItemEntity) {
    const cart = this.carts[userId] || [];
    const existing = cart.find((entry) => entry.productId === item.productId);
    const requested = (existing?.quantity ?? 0) + item.quantity;

    await this.assertStock(item.productId, requested);

    // Si el producto ya está en el carrito se acumula la cantidad en la misma línea
    if (existing) {
      existing.quantity = requested;
      existing.totalPrice = existing.unitPrice * requested;
      return existing;
    }

    cart.push(item);
    this.carts[userId] = cart;
    return item;
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const cart = this.carts[userId] || [];
    const item = cart.find((entry) => entry.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }
    if (quantity > 0) {
      await this.assertStock(item.productId, quantity);
    }
    item.quantity = quantity;
    item.totalPrice = item.unitPrice * quantity;
    if (quantity === 0) {
      this.carts[userId] = cart.filter((entry) => entry.id !== itemId);
    }
    return item;
  }

  removeItem(userId: string, itemId: string) {
    const cart = this.carts[userId] || [];
    this.carts[userId] = cart.filter((entry) => entry.id !== itemId);
    return { success: true };
  }

  private async assertStock(productId: string, quantity: number) {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }
    if (quantity > product.inventory) {
      throw new BadRequestException(
        `Inventario insuficiente para ${product.name}: solicitaste ${quantity} y hay ${product.inventory} disponibles`,
      );
    }
  }
}
