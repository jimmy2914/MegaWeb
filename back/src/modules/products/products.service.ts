import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ProductEntity {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  category: string;
  images: string[];
  inventory: number;
  featured: boolean;
}

@Injectable()
export class ProductsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    const count = await this.prisma.product.count();
    if (count === 0) {
      console.log('Sembrando productos iniciales de e-commerce...');
      await this.prisma.product.createMany({
        data: [
          {
            name: 'Panel Solar Monocristalino 550W',
            description: 'Panel de alta eficiencia y rendimiento con tecnología monocristalina ideal para sistemas residenciales e industriales.',
            price: 850000,
            currency: 'COP',
            category: 'PANEL',
            images: ['https://images.unsplash.com/photo-1509391366360-2e959784a276?w=600&auto=format&fit=crop'],
            inventory: 45,
            featured: true,
          },
          {
            name: 'Inversor Híbrido Smart 5kW',
            description: 'Inversor inteligente con soporte on-grid/off-grid, control via app y gestión eficiente de almacenamiento.',
            price: 2450000,
            currency: 'COP',
            category: 'INVERTER',
            images: ['https://images.unsplash.com/photo-1620052581237-5d36667be337?w=600&auto=format&fit=crop'],
            inventory: 15,
            featured: true,
          },
          {
            name: 'Batería de Litio LiFePO4 48V 100Ah',
            description: 'Batería de ciclo profundo de larga vida útil para almacenamiento energético seguro y eficiente.',
            price: 4800000,
            currency: 'COP',
            category: 'BATTERY',
            images: ['https://images.unsplash.com/photo-1548345680-f5475ea5df84?w=600&auto=format&fit=crop'],
            inventory: 12,
            featured: true,
          },
          {
            name: 'Instalación de Kit Solar Comercial',
            description: 'Servicio profesional llave en mano que incluye diseño conceptual, cálculo de ingeniería y montaje completo en sitio.',
            price: 1500000,
            currency: 'COP',
            category: 'SERVICE',
            images: ['https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?w=600&auto=format&fit=crop'],
            inventory: 99,
            featured: false,
          }
        ]
      });
      console.log('¡Productos sembrados con éxito!');
    }
  }

  async findAll() {
    const items = await this.prisma.product.findMany();
    return {
      items,
      total: items.length,
      page: 1,
      limit: items.length,
    };
  }

  async findOne(id: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return product;
  }

  async create(data: Omit<ProductEntity, 'id' | 'featured'> & { featured?: boolean }) {
    return this.prisma.product.create({
      data: {
        name: data.name,
        description: data.description,
        price: data.price,
        currency: data.currency || 'COP',
        category: data.category,
        images: data.images || [],
        inventory: data.inventory || 0,
        featured: data.featured ?? false,
      },
    });
  }

  async update(id: string, updates: Partial<ProductEntity>) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: {
        name: updates.name,
        description: updates.description,
        price: updates.price,
        currency: updates.currency,
        category: updates.category,
        images: updates.images,
        inventory: updates.inventory,
        featured: updates.featured,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.product.delete({
      where: { id },
    });
    return { success: true };
  }
}
