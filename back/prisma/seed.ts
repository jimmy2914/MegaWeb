import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando proceso de siembra de base de datos (seeding)...');

  // 1. Crear Usuarios de prueba (Admin y Cliente)
  const saltRounds = 10;
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', saltRounds);
  const clientPasswordHash = await bcrypt.hash('ClientPassword123!', saltRounds);

  console.log('Sembrando usuarios...');
  const admin = await prisma.user.upsert({
    where: { email: 'admin@megaproyectos.net' },
    update: {},
    create: {
      email: 'admin@megaproyectos.net',
      name: 'Administrador MegaProyectos',
      password: adminPasswordHash,
      role: 'ADMIN',
    },
  });

  const client = await prisma.user.upsert({
    where: { email: 'client@megaproyectos.net' },
    update: {},
    create: {
      email: 'client@megaproyectos.net',
      name: 'Cliente de Prueba',
      password: clientPasswordHash,
      role: 'CLIENT',
    },
  });

  console.log(`Usuarios listos: Admin (${admin.email}), Cliente (${client.email})`);

  // 2. Sembrar Categorías de Foro
  console.log('Sembrando categorías para el foro...');
  const catSolar = await prisma.category.upsert({
    where: { name: 'Energía Solar y Paneles' },
    update: {},
    create: { name: 'Energía Solar y Paneles' },
  });

  const catInverters = await prisma.category.upsert({
    where: { name: 'Inversores y Regulación' },
    update: {},
    create: { name: 'Inversores y Regulación' },
  });

  const catBatteries = await prisma.category.upsert({
    where: { name: 'Baterías y Acumuladores' },
    update: {},
    create: { name: 'Baterías y Acumuladores' },
  });

  console.log('Categorías del foro sembradas con éxito.');

  // 3. Sembrar Productos Iniciales de E-commerce
  console.log('Sembrando catálogo de productos...');
  const productsData = [
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
  ];

  for (const product of productsData) {
    const existing = await prisma.product.findFirst({
      where: { name: product.name },
    });
    if (!existing) {
      await prisma.product.create({
        data: product,
      });
      console.log(`Producto creado: ${product.name}`);
    }
  }

  // 4. Sembrar algunos hilos de discusión de prueba
  console.log('Sembrando hilos de discusión de foro...');
  const existingThread = await prisma.thread.findFirst({
    where: { authorId: admin.id },
  });

  if (!existingThread) {
    const thread = await prisma.thread.create({
      data: {
        title: 'Guía de instalación básica de Paneles Monocristalinos',
        content: 'Estimada comunidad, abro este hilo para compartir la guía oficial de instalación y fijación estructural para paneles monocristalinos de 550W. Recuerden mantener la inclinación recomendada de 15 grados.',
        categoryId: catSolar.id,
        authorId: admin.id,
      },
    });

    await prisma.post.create({
      data: {
        content: 'Muchas gracias por la guía. ¿Qué marca de soportes de aluminio recomiendan para techos de teja de zinc?',
        threadId: thread.id,
        authorId: client.id,
      },
    });

    console.log('Hilos y respuestas iniciales creados.');
  }

  console.log('¡Siembra de base de datos finalizada con éxito!');
}

main()
  .catch((e) => {
    console.error('Error durante la siembra de la base de datos:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
