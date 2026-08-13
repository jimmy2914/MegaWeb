import { Controller, Get, Post, Put, Delete, Body, Param, Request, UseGuards } from '@nestjs/common';
import { CartService } from './cart.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('CLIENT')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  getCart(@Request() req: any) {
    return this.cartService.getCart(req.user.id);
  }

  @Post('items')
  addItem(@Request() req: any, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(req.user.id, {
      id: String(Date.now()),
      productId: dto.productId,
      quantity: dto.quantity,
      unitPrice: dto.unitPrice,
      totalPrice: dto.quantity * dto.unitPrice,
    });
  }

  @Put('items/:itemId')
  updateItem(@Request() req: any, @Param('itemId') itemId: string, @Body() dto: UpdateCartItemDto) {
    return this.cartService.updateItem(req.user.id, itemId, dto.quantity);
  }

  @Delete('items/:itemId')
  removeItem(@Request() req: any, @Param('itemId') itemId: string) {
    return this.cartService.removeItem(req.user.id, itemId);
  }
}
