import { IsArray, IsEnum, IsNotEmpty, IsNumber, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ShippingAddressDto {
  @IsNotEmpty()
  street: string;

  @IsNotEmpty()
  city: string;

  @IsNotEmpty()
  department: string;

  postalCode?: string;

  @IsNotEmpty()
  phone: string;
}

class OrderItemDto {
  @IsNotEmpty()
  productId: string;

  @IsNumber()
  quantity: number;
}

export class CreateOrderDto {
  @IsEnum(['PAGOS_PSE', 'CARD', 'NEQUI', 'BALOTO'])
  paymentMethod: 'PAGOS_PSE' | 'CARD' | 'NEQUI' | 'BALOTO';

  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
