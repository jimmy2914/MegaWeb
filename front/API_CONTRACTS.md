# API Contracts

Este documento define los contratos API necesarios para los módulos de MegaWeb: E-commerce, Foro/Comunidad, Calculadora Solar y Autenticación.

## Principios generales
- Base URL: `/api/v1`
- Autenticación: JWT Bearer
- Backend recomendado: Node.js + TypeScript (NestJS)
- Base de datos central: PostgreSQL
- ORM: Prisma
- Estilo: API RESTful con control de roles y validaciones de seguridad

## Modelos TypeScript principales

```ts
export type Role = 'ADMIN' | 'CLIENT' | 'FORUM_USER';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: 'COP' | 'USD';
  category: 'PANEL' | 'INVERTER' | 'BATTERY' | 'SERVICE';
  images: string[];
  inventory: number;
  featured: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface OrderItem {
  productId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  shipping: number;
  total: number;
  status: 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: 'PAGOS_PSE' | 'CARD' | 'NEQUI' | 'BALOTO';
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

export interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export interface ForumThread {
  id: string;
  title: string;
  categoryId: string;
  authorId: string;
  content: string;
  tags: string[];
  status: 'OPEN' | 'CLOSED' | 'ANSWERED';
  createdAt: string;
  updatedAt: string;
}

export interface ForumPost {
  id: string;
  threadId: string;
  authorId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface Reaction {
  id: string;
  postId: string;
  userId: string;
  type: 'LIKE' | 'LOVE' | 'UPVOTE' | 'DOWNVOTE';
}

export interface KnowledgeArticle {
  id: string;
  title: string;
  summary: string;
  content: string;
  authorId: string;
  category: string;
  tags: string[];
  publishedAt: string;
}

export interface SolarCalculationInput {
  location: {
    city: string;
    department: string;
    latitude: number;
    longitude: number;
  };
  averageDailyConsumptionKWh: number;
  peakPowerDemandKw: number;
  panelType: string;
  panelEfficiency: number;
  inverterEfficiency: number;
  systemLossesPercentage: number;
  tiltAngle: number;
  orientation: 'NORTE' | 'SUR' | 'ESTE' | 'OESTE';
  budgetCOP?: number;
}

export interface SolarCalculationResult {
  recommendedCapacityKw: number;
  numberOfPanels: number;
  estimatedAnnualProductionKWh: number;
  estimatedMonthlyProductionKWh: number;
  estimatedSavingsCOP: number;
  paybackYears: number;
  suggestedComponents: Array<{
    type: 'PANEL' | 'INVERTER' | 'BATTERY';
    quantity: number;
    description: string;
  }>;
  notes: string[];
}
```

---

## Autenticación

### [AUTENTICACIÓN] Register user

- Método: POST
- Ruta: /api/v1/auth/register
- Auth: optional
- Roles: ALL
- Request Body:

```ts
{
  name: string;
  email: string;
  password: string;
  role: 'CLIENT' | 'FORUM_USER';
}
```

- Response:

```ts
{
  user: User;
  accessToken: string;
  refreshToken: string;
}
```

- Notas: validar email único, password mínimo 8 caracteres, role solo CLIENT o FORUM_USER.
- Prioridad: High

### [AUTENTICACIÓN] Login

- Método: POST
- Ruta: /api/v1/auth/login
- Auth: optional
- Roles: ALL
- Request Body:

```ts
{
  email: string;
  password: string;
}
```

- Response:

```ts
{
  accessToken: string;
  refreshToken: string;
  user: User;
}
```

- Notas: bcrypt para comparación, JWT expiración configurada.
- Prioridad: High

### [AUTENTICACIÓN] Refresh token

- Método: POST
- Ruta: /api/v1/auth/refresh
- Auth: optional
- Roles: ALL
- Request Body:

```ts
{
  refreshToken: string;
}
```

- Response:

```ts
{
  accessToken: string;
  refreshToken: string;
}
```

- Notas: invalidar refresh tokens revocados.
- Prioridad: Medium

### [AUTENTICACIÓN] Get profile

- Método: GET
- Ruta: /api/v1/auth/profile
- Auth: Bearer JWT required
- Roles: ADMIN/CLIENT/FORUM_USER
- Request Body: none
- Response:

```ts
User
```

- Notas: devuelve datos del usuario autenticado.
- Prioridad: High

### [AUTENTICACIÓN] Update profile

- Método: PUT
- Ruta: /api/v1/auth/profile
- Auth: Bearer JWT required
- Roles: ADMIN/CLIENT/FORUM_USER
- Request Body:

```ts
{
  name?: string;
  password?: string;
}
```

- Response:

```ts
User
```

- Notas: si se cambia password, aplicar bcrypt.
- Prioridad: Medium

### [AUTENTICACIÓN] List users (admin)

- Método: GET
- Ruta: /api/v1/auth/users
- Auth: Bearer JWT required
- Roles: ADMIN
- Request Body: none
- Response:

```ts
{
  users: User[];
}
```

- Notas: paginación opcional, filtros por role.
- Prioridad: Low

---

## E-commerce

### [E-COMMERCE] List products and services

- Método: GET
- Ruta: /api/v1/products
- Auth: optional
- Roles: ALL
- Query Params:
  - `category?: 'PANEL' | 'INVERTER' | 'BATTERY' | 'SERVICE'`
  - `search?: string`
  - `page?: number`
  - `limit?: number`
  - `sort?: 'price_asc' | 'price_desc' | 'newest'`
- Request Body: none
- Response:

```ts
{
  items: Product[];
  total: number;
  page: number;
  limit: number;
}
```

- Notas: incluir productos y servicios en un mismo recurso.
- Prioridad: High

### [E-COMMERCE] Get product details

- Método: GET
- Ruta: /api/v1/products/:id
- Auth: optional
- Roles: ALL
- Request Body: none
- Response:

```ts
Product
```

- Notas: devolver 404 si no existe.
- Prioridad: High

### [E-COMMERCE] Create product/service (admin)

- Método: POST
- Ruta: /api/v1/products
- Auth: Bearer JWT required
- Roles: ADMIN
- Request Body:

```ts
{
  name: string;
  description: string;
  price: number;
  currency: 'COP' | 'USD';
  category: 'PANEL' | 'INVERTER' | 'BATTERY' | 'SERVICE';
  images: string[];
  inventory: number;
  featured?: boolean;
}
```

- Response:

```ts
Product
```

- Notas: validaciones de precio >= 0, inventario >= 0.
- Prioridad: Medium

### [E-COMMERCE] Update product/service (admin)

- Método: PUT
- Ruta: /api/v1/products/:id
- Auth: Bearer JWT required
- Roles: ADMIN
- Request Body:

```ts
{
  name?: string;
  description?: string;
  price?: number;
  currency?: 'COP' | 'USD';
  category?: 'PANEL' | 'INVERTER' | 'BATTERY' | 'SERVICE';
  images?: string[];
  inventory?: number;
  featured?: boolean;
}
```

- Response:

```ts
Product
```

- Notas: actualizar solo campos proporcionados.
- Prioridad: Medium

### [E-COMMERCE] Delete product/service (admin)

- Método: DELETE
- Ruta: /api/v1/products/:id
- Auth: Bearer JWT required
- Roles: ADMIN
- Request Body: none
- Response:

```ts
{
  success: boolean;
}
```

- Notas: evitar borrar si hay órdenes activas; considerar soft delete.
- Prioridad: Low

### [E-COMMERCE] Get cart

- Método: GET
- Ruta: /api/v1/cart
- Auth: Bearer JWT required
- Roles: CLIENT
- Request Body: none
- Response:

```ts
{
  items: CartItem[];
  subtotal: number;
}
```

- Notas: carrito persistente por usuario.
- Prioridad: High

### [E-COMMERCE] Add item to cart

- Método: POST
- Ruta: /api/v1/cart/items
- Auth: Bearer JWT required
- Roles: CLIENT
- Request Body:

```ts
{
  productId: string;
  quantity: number;
}
```

- Response:

```ts
CartItem
```

- Notas: validar existencia de inventario.
- Prioridad: High

### [E-COMMERCE] Update cart item

- Método: PUT
- Ruta: /api/v1/cart/items/:itemId
- Auth: Bearer JWT required
- Roles: CLIENT
- Request Body:

```ts
{
  quantity: number;
}
```

- Response:

```ts
CartItem
```

- Notas: eliminar si quantity = 0.
- Prioridad: High

### [E-COMMERCE] Remove item from cart

- Método: DELETE
- Ruta: /api/v1/cart/items/:itemId
- Auth: Bearer JWT required
- Roles: CLIENT
- Request Body: none
- Response:

```ts
{
  success: boolean;
}
```

- Notas: actualizar subtotal.
- Prioridad: High

### [E-COMMERCE] Create order

- Método: POST
- Ruta: /api/v1/orders
- Auth: Bearer JWT required
- Roles: CLIENT
- Request Body:

```ts
{
  paymentMethod: 'PAGOS_PSE' | 'CARD' | 'NEQUI' | 'BALOTO';
  shippingAddress: {
    street: string;
    city: string;
    department: string;
    postalCode?: string;
    phone: string;
  };
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}
```

- Response:

```ts
Order
```

- Notas: validar inventario, reservar stock, calcular impuestos y totales.
- Prioridad: High

### [E-COMMERCE] Get order history

- Método: GET
- Ruta: /api/v1/orders
- Auth: Bearer JWT required
- Roles: CLIENT
- Query Params:
  - `page?: number`
  - `limit?: number`
- Request Body: none
- Response:

```ts
{
  orders: Order[];
  total: number;
  page: number;
  limit: number;
}
```

- Notas: histórico de compras por cliente.
- Prioridad: High

### [E-COMMERCE] Get order details

- Método: GET
- Ruta: /api/v1/orders/:orderId
- Auth: Bearer JWT required
- Roles: CLIENT/ADMIN
- Request Body: none
- Response:

```ts
Order
```

- Notas: ADMIN puede acceder a cualquier orden.
- Prioridad: High

### [E-COMMERCE] Initiate payment

- Método: POST
- Ruta: /api/v1/payments/initiate
- Auth: Bearer JWT required
- Roles: CLIENT
- Request Body:

```ts
{
  orderId: string;
  gateway: 'PAGOS_PSE' | 'CARD' | 'NEQUI' | 'BALOTO';
}
```

- Response:

```ts
{
  paymentUrl: string;
  paymentId: string;
  expiresAt: string;
}
```

- Notas: integrar con pasarelas de pago colombianas.
- Prioridad: High

### [E-COMMERCE] Inventory report (admin)

- Método: GET
- Ruta: /api/v1/inventory
- Auth: Bearer JWT required
- Roles: ADMIN
- Request Body: none
- Response:

```ts
{
  products: Array<{
    productId: string;
    inventory: number;
    reserved: number;
  }>;
}
```

- Notas: consulta de stock y reservas.
- Prioridad: Medium

### [E-COMMERCE] Adjust inventory (admin)

- Método: PATCH
- Ruta: /api/v1/inventory/:productId
- Auth: Bearer JWT required
- Roles: ADMIN
- Request Body:

```ts
{
  inventory: number;
}
```

- Response:

```ts
Product
```

- Notas: actualizar stock manualmente.
- Prioridad: Medium

---

## Foro / Comunidad

### [FORO] List categories

- Método: GET
- Ruta: /api/v1/forum/categories
- Auth: optional
- Roles: ALL
- Request Body: none
- Response:

```ts
{
  categories: ForumCategory[];
}
```

- Notas: categorías para hilos de discusión.
- Prioridad: High

### [FORO] List threads

- Método: GET
- Ruta: /api/v1/forum/threads
- Auth: optional
- Roles: ALL
- Query Params:
  - `categoryId?: string`
  - `search?: string`
  - `page?: number`
  - `limit?: number`
- Request Body: none
- Response:

```ts
{
  threads: ForumThread[];
  total: number;
  page: number;
  limit: number;
}
```

- Notas: mostrar hilos activos y recientes.
- Prioridad: High

### [FORO] Get thread details

- Método: GET
- Ruta: /api/v1/forum/threads/:id
- Auth: optional
- Roles: ALL
- Request Body: none
- Response:

```ts
{
  thread: ForumThread;
  posts: ForumPost[];
}
```

- Notas: incluir respuestas y estado.
- Prioridad: High

### [FORO] Create thread

- Método: POST
- Ruta: /api/v1/forum/threads
- Auth: Bearer JWT required
- Roles: CLIENT/FORUM_USER
- Request Body:

```ts
{
  title: string;
  categoryId: string;
  content: string;
  tags?: string[];
}
```

- Response:

```ts
ForumThread
```

- Notas: validar longitud del título y contenido.
- Prioridad: High

### [FORO] Update thread

- Método: PUT
- Ruta: /api/v1/forum/threads/:id
- Auth: Bearer JWT required
- Roles: CLIENT/FORUM_USER/ADMIN
- Request Body:

```ts
{
  title?: string;
  content?: string;
  categoryId?: string;
  tags?: string[];
  status?: 'OPEN' | 'CLOSED' | 'ANSWERED';
}
```

- Response:

```ts
ForumThread
```

- Notas: solo autor o ADMIN puede editar.
- Prioridad: Medium

### [FORO] Delete thread

- Método: DELETE
- Ruta: /api/v1/forum/threads/:id
- Auth: Bearer JWT required
- Roles: CLIENT/FORUM_USER/ADMIN
- Request Body: none
- Response:

```ts
{
  success: boolean;
}
```

- Notas: solo autor o ADMIN puede eliminar.
- Prioridad: Medium

### [FORO] Add post/reply

- Método: POST
- Ruta: /api/v1/forum/threads/:threadId/posts
- Auth: Bearer JWT required
- Roles: CLIENT/FORUM_USER/ADMIN
- Request Body:

```ts
{
  content: string;
}
```

- Response:

```ts
ForumPost
```

- Notas: permitir respuestas de administradores como nota oficial.
- Prioridad: High

### [FORO] Update post

- Método: PUT
- Ruta: /api/v1/forum/posts/:id
- Auth: Bearer JWT required
- Roles: CLIENT/FORUM_USER/ADMIN
- Request Body:

```ts
{
  content: string;
}
```

- Response:

```ts
ForumPost
```

- Notas: solo autor o ADMIN puede editar.
- Prioridad: Medium

### [FORO] Delete post

- Método: DELETE
- Ruta: /api/v1/forum/posts/:id
- Auth: Bearer JWT required
- Roles: CLIENT/FORUM_USER/ADMIN
- Request Body: none
- Response:

```ts
{
  success: boolean;
}
```

- Notas: mantener hilos coherentes al eliminar posts.
- Prioridad: Medium

### [FORO] React to post

- Método: POST
- Ruta: /api/v1/forum/posts/:postId/reactions
- Auth: Bearer JWT required
- Roles: CLIENT/FORUM_USER/ADMIN
- Request Body:

```ts
{
  type: 'LIKE' | 'LOVE' | 'UPVOTE' | 'DOWNVOTE';
}
```

- Response:

```ts
Reaction
```

- Notas: un usuario por reacción por post; actualizar conteo.
- Prioridad: Medium

### [FORO] List knowledge articles

- Método: GET
- Ruta: /api/v1/forum/knowledge
- Auth: optional
- Roles: ALL
- Query Params:
  - `category?: string`
  - `search?: string`
  - `page?: number`
  - `limit?: number`
- Request Body: none
- Response:

```ts
{
  articles: KnowledgeArticle[];
  total: number;
  page: number;
  limit: number;
}
```

- Notas: base de conocimientos pública.
- Prioridad: High

### [FORO] Get knowledge article

- Método: GET
- Ruta: /api/v1/forum/knowledge/:id
- Auth: optional
- Roles: ALL
- Request Body: none
- Response:

```ts
KnowledgeArticle
```

- Notas: devolver artículo completo.
- Prioridad: Medium

### [FORO] Create knowledge article (admin)

- Método: POST
- Ruta: /api/v1/forum/knowledge
- Auth: Bearer JWT required
- Roles: ADMIN
- Request Body:

```ts
{
  title: string;
  summary: string;
  content: string;
  category: string;
  tags?: string[];
}
```

- Response:

```ts
KnowledgeArticle
```

- Notas: validar contenido y publicar fecha.
- Prioridad: Medium

---

## Calculadora Solar

### [CALCULADORA SOLAR] Run solar sizing calculation

- Método: POST
- Ruta: /api/v1/solar/calculate
- Auth: optional
- Roles: ALL
- Request Body:

```ts
SolarCalculationInput
```

- Response:

```ts
SolarCalculationResult
```

- Notas: usar datos energéticos de Colombia, irradiación y pérdidas de sistema.
- Prioridad: High

### [CALCULADORA SOLAR] Save calculation project

- Método: POST
- Ruta: /api/v1/solar/projects
- Auth: Bearer JWT required
- Roles: CLIENT
- Request Body:

```ts
{
  name: string;
  description?: string;
  input: SolarCalculationInput;
  result: SolarCalculationResult;
}
```

- Response:

```ts
{
  id: string;
  name: string;
  description?: string;
  input: SolarCalculationInput;
  result: SolarCalculationResult;
  createdAt: string;
  updatedAt: string;
}
```

- Notas: guardar proyectos de dimensionamiento de usuarios.
- Prioridad: Medium

### [CALCULADORA SOLAR] List saved projects

- Método: GET
- Ruta: /api/v1/solar/projects
- Auth: Bearer JWT required
- Roles: CLIENT
- Request Body: none
- Response:

```ts
{
  projects: Array<{
    id: string;
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  }>;
}
```

- Notas: listar proyectos del usuario.
- Prioridad: Medium

### [CALCULADORA SOLAR] Get saved project details

- Método: GET
- Ruta: /api/v1/solar/projects/:id
- Auth: Bearer JWT required
- Roles: CLIENT
- Request Body: none
- Response:

```ts
{
  id: string;
  name: string;
  description?: string;
  input: SolarCalculationInput;
  result: SolarCalculationResult;
  createdAt: string;
  updatedAt: string;
}
```

- Notas: solo propietario puede acceder.
- Prioridad: Medium

### [CALCULADORA SOLAR] Delete saved project

- Método: DELETE
- Ruta: /api/v1/solar/projects/:id
- Auth: Bearer JWT required
- Roles: CLIENT
- Request Body: none
- Response:

```ts
{
  success: boolean;
}
```

- Notas: conservar historial de dimensionamientos.
- Prioridad: Low

---

## Notas de implementación

- Todas las rutas deben devolver errores estándar con códigos HTTP y mensajes JSON.
- Validar JWT y roles con middleware centralizado.
- Utilizar Prisma para modelar todos los recursos y mantener integridad referencial.
- Asegurar que los endpoints públicos no expongan datos sensibles.
- Los endpoints de pago deben trabajar con pasarelas colombianas y capturar el estado de pago.
