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

  // 4. Sembrar hilos de discusión reales del foro
  console.log('Sembrando hilos de discusión del foro...');

  // Eliminar cualquier hilo que diga "prueba" en título o contenido
  await prisma.thread.deleteMany({
    where: {
      OR: [
        { title: { contains: 'prueba', mode: 'insensitive' } },
        { content: { contains: 'prueba', mode: 'insensitive' } },
      ],
    },
  });

  const catGeneral = await prisma.category.upsert({
    where: { name: 'General' },
    update: {},
    create: { name: 'General' },
  });

  const realThreads = [
    {
      title: '¿Cuál es la inclinación y orientación óptima para paneles solares en Colombia?',
      content: 'Hola a todos, estoy diseñando un sistema fotovoltaico para una vivienda en la región andina. Quisiera conocer las recomendaciones técnicas sobre el ángulo de inclinación ideal y la orientación adecuada para maximizar la captación de radiación solar durante todo el año.',
      categoryId: catSolar.id,
      authorId: client.id,
      status: 'OPEN',
      approved: true,
      posts: [
        {
          content: '¡Hola Carlos! Para la latitud media de Colombia (aprox. 4° a 6° Norte), se recomienda una inclinación fija entre 10° y 15° orientados hacia el Sur verdadero. Esta inclinación además ayuda al drenaje natural del agua de lluvia, reduciendo la acumulación de polvo sobre los paneles.',
          authorId: admin.id,
          approved: true,
        },
        {
          content: 'Excelente aclaración. ¿Recomiendan alguna marca de estructura de fijación en aluminio anodizado para evitar la corrosión galvánica en cubiertas de teja metálica?',
          authorId: client.id,
          approved: true,
        },
      ],
    },
    {
      title: 'Comparativa entre Inversores Centrales e Inversores Híbridos con Almacenamiento',
      content: 'Estimados ingenieros, en nuestra empresa agroindustrial evaluamos actualizar el sistema eléctrico. Queremos analizar las ventajas operativas de migrar de un inversor on-grid convencional a un inversor híbrido inteligente conectado a un banco de baterías.',
      categoryId: catInverters.id,
      authorId: client.id,
      status: 'OPEN',
      approved: true,
      posts: [
        {
          content: 'Buenas tardes. La principal ventaja de los inversores híbridos es la capacidad de respaldo ante fallos de red en milisegundos (función UPS/EPS), garantizando continuidad operacional para cargas críticas. Adicionalmente, permiten gestión de picos de demanda (peak shaving) para reducir costos en la factura de energía.',
          authorId: admin.id,
          approved: true,
        },
      ],
    },
    {
      title: 'Mejores prácticas para la gestión y vida útil de Baterías LiFePO4 (Litio)',
      content: 'Abro este hilo para discutir recomendaciones técnicas en la configuración del BMS y los ciclos de carga/descarga de baterías Litio Ferro-fosfato (LiFePO4) en proyectos fotovoltaicos aislados.',
      categoryId: catBatteries.id,
      authorId: admin.id,
      status: 'OPEN',
      approved: true,
      posts: [
        {
          content: 'Nosotros recomendamos ajustar la profundidad máxima de descarga (DoD) al 80% y mantener la temperatura del recinto por debajo de 25°C. Con estos parámetros hemos logrado superar los 4.500 ciclos manteniendo más del 80% de capacidad de retención.',
          authorId: client.id,
          approved: true,
        },
      ],
    },
    {
      title: 'Trámites y normativa CREG 174 para autoconsumo y venta de excedentes',
      content: 'Espacio dedicado a resolver dudas sobre el proceso de certificación RETIE y la solicitud de punto de conexión ante los operadores de red (OR) para proyectos solares menores a 100 kW.',
      categoryId: catGeneral.id,
      authorId: admin.id,
      status: 'OPEN',
      approved: true,
      posts: [
        {
          content: '¿Cuáles son los documentos indispensables que exige el operador de red para otorgar la viabilidad técnica?',
          authorId: client.id,
          approved: true,
        },
        {
          content: 'Se requiere el diagrama unifilar avalado por un ingeniero electricista matriculado, los certificados de conformidad de producto (inversor y paneles) y la memoria de cálculo del sistema de puesta a tierra.',
          authorId: admin.id,
          approved: true,
        },
      ],
    },
  ];

  for (const tData of realThreads) {
    const { posts, ...threadFields } = tData;
    const existing = await prisma.thread.findFirst({
      where: { title: threadFields.title },
    });

    if (!existing) {
      const createdThread = await prisma.thread.create({
        data: threadFields,
      });

      for (const pData of posts) {
        await prisma.post.create({
          data: {
            ...pData,
            threadId: createdThread.id,
          },
        });
      }
    }
  }

  console.log('¡Siembra de hilos y respuestas finalizada con éxito!');

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
