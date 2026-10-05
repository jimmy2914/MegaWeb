import { ArrayNotEmpty, IsArray, IsEnum, IsInt, IsNotEmpty, IsObject, Min, ValidateNested } from 'class-validator';
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

  @IsInt()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  // WHATSAPP: el pago se coordina con el cliente por WhatsApp después de crear el pedido
  @IsEnum(['PAGOS_PSE', 'CARD', 'NEQUI', 'BALOTO', 'WHATSAPP'])
  paymentMethod: 'PAGOS_PSE' | 'CARD' | 'NEQUI' | 'BALOTO' | 'WHATSAPP';

  @IsObject()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
