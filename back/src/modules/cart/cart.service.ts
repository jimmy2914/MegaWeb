import { Injectable, NotFoundException } from '@nestjs/common';

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

  getCart(userId: string) {
    const items = this.carts[userId] || [];
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    return { items, subtotal };
  }

  addItem(userId: string, item: CartItemEntity) {
    const cart = this.carts[userId] || [];
    cart.push(item);
    this.carts[userId] = cart;
    return item;
  }

  updateItem(userId: string, itemId: string, quantity: number) {
    const cart = this.carts[userId] || [];
    const item = cart.find((entry) => entry.id === itemId);
    if (!item) {
      throw new NotFoundException('Cart item not found');
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
}
