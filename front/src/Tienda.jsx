import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { useCart } from './CartContext';
import './Tienda.css';

const API_URL = 'http://localhost:3000/api/v1';

function Tienda() {
    const { user, navigateToLogin } = useAuth();
    const {
        cart,
        showCartDrawer,
        setShowCartDrawer,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        getCartCount,
        getSubtotal,
        getTax,
        getShipping,
        getTotal
    } = useCart();

    // --- Estado de productos ---
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);

    const getCheckoutKey = (userId) => userId ? `mp_checkout_${userId}` : 'mp_checkout_guest';

    // --- Estado de checkout, modal y guía de usuario ---
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState(false);
    const [checkoutSuccess, setCheckoutSuccess] = useState(false);
    const [orderId, setOrderId] = useState('');
    const [whatsappUrl, setWhatsappUrl] = useState('');
    const [orderError, setOrderError] = useState('');
    const [checkoutLoading, setCheckoutLoading] = useState(false);

    // --- Estado de administración (CRUD de productos) ---
    const EMPTY_FORM = { name: '', description: '', price: '', currency: 'COP', category: 'PANEL', images: '', inventory: '', featured: false };
    const [showProductModal, setShowProductModal] = useState(false);
    const [editingProduct, setEditingProduct] = useState(null);
    const [productForm, setProductForm] = useState(EMPTY_FORM);
    const [productFormError, setProductFormError] = useState('');
    const [productFormLoading, setProductFormLoading] = useState(false);
    const [showConfirmDelete, setShowConfirmDelete] = useState(false);
    const [deletingProduct, setDeletingProduct] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // --- Datos de facturación/envío ---
    const [addressStreet, setAddressStreet] = useState('');
    const [addressCity, setAddressCity] = useState('');
    const [addressDept, setAddressDept] = useState('');
    const [addressPhone, setAddressPhone] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('WHATSAPP');
    const [isCheckoutLoaded, setIsCheckoutLoaded] = useState(false);

    // --- Consultar productos al montar ---
    useEffect(() => {
        fetchProducts();
    }, []);

    // --- Cargar datos de checkout guardados según el usuario ---
    useEffect(() => {
        const checkoutKey = getCheckoutKey(user?.id);
        const savedCheckout = localStorage.getItem(checkoutKey);
        if (savedCheckout) {
            try {
                const parsed = JSON.parse(savedCheckout);
                setAddressStreet(parsed.street || '');
                setAddressCity(parsed.city || '');
                setAddressDept(parsed.dept || '');
                setAddressPhone(parsed.phone || '');
                setPaymentMethod(parsed.paymentMethod || 'WHATSAPP');
            } catch {
                // Si falla el parseo, mantener valores por defecto
            }
        }
        setIsCheckoutLoaded(true);
    }, [user?.id]);

    // --- Persistir proceso de compra al cambiar datos ---
    useEffect(() => {
        if (!isCheckoutLoaded) return;
        const checkoutKey = getCheckoutKey(user?.id);
        const checkoutData = {
            street: addressStreet,
            city: addressCity,
            dept: addressDept,
            phone: addressPhone,
            paymentMethod
        };
        localStorage.setItem(checkoutKey, JSON.stringify(checkoutData));
    }, [addressStreet, addressCity, addressDept, addressPhone, paymentMethod, user?.id, isCheckoutLoaded]);

    const fetchProducts = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/products`);
            const data = await res.json();
            setProducts(data.items || []);
            setFilteredProducts(data.items || []);
        } catch (e) {
            console.error('Error al cargar productos', e);
        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // CRUD DE PRODUCTOS (sólo ADMIN)
    // =========================================================

    const isAdmin = user?.role === 'ADMIN';

    const openCreateProduct = () => {
        setEditingProduct(null);
        setProductForm(EMPTY_FORM);
        setProductFormError('');
        setShowProductModal(true);
    };

    const openEditProduct = (product) => {
        setEditingProduct(product);
        setProductForm({
            name: product.name,
            description: product.description,
            price: product.price,
            currency: product.currency,
            category: product.category,
            images: product.images[0] || '',
            inventory: product.inventory,
            featured: product.featured,
        });
        setProductFormError('');
        setShowProductModal(true);
    };

    const closeProductModal = () => {
        setShowProductModal(false);
        setEditingProduct(null);
        setProductFormError('');
    };

    const handleProductFormChange = (e) => {
        const { name, value, type, checked } = e.target;
        setProductForm(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSaveProduct = async (e) => {
        e.preventDefault();
        setProductFormError('');
        setProductFormLoading(true);
        const activeToken = localStorage.getItem('mp_token');
        const payload = {
            name: productForm.name,
            description: productForm.description,
            price: parseFloat(productForm.price),
            currency: productForm.currency,
            category: productForm.category,
            images: productForm.images ? [productForm.images] : [],
            inventory: parseInt(productForm.inventory, 10),
            featured: productForm.featured,
        };
        try {
            const url = editingProduct
                ? `${API_URL}/products/${editingProduct.id}`
                : `${API_URL}/products`;
            const method = editingProduct ? 'PUT' : 'POST';
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${activeToken}` },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error al guardar el producto');
            await fetchProducts();
            closeProductModal();
        } catch (err) {
            setProductFormError(err.message);
        } finally {
            setProductFormLoading(false);
        }
    };

    const openDeleteConfirm = (product) => {
        setDeletingProduct(product);
        setShowConfirmDelete(true);
    };

    const handleDeleteProduct = async () => {
        if (!deletingProduct) return;
        setDeleteLoading(true);
        const activeToken = localStorage.getItem('mp_token');
        try {
            const res = await fetch(`${API_URL}/products/${deletingProduct.id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${activeToken}` },
            });
            if (!res.ok) throw new Error('Error al eliminar el producto');
            await fetchProducts();
            setShowConfirmDelete(false);
            setDeletingProduct(null);
        } catch (err) {
            alert(err.message);
        } finally {
            setDeleteLoading(false);
        }
    };

    // --- Filtros ---
    const handleCategoryFilter = (category) => {
        setCategoryFilter(category);
        if (category === 'ALL') {
            setFilteredProducts(products);
        } else {
            setFilteredProducts(products.filter(p => p.category === category));
        }
    };

    // --- Generar Factura y Abrir WhatsApp ---
    const EMPRESA_WHATSAPP = '573126217709';

    const handleCheckoutSubmit = (e) => {
        e.preventDefault();
        setOrderError('');

        // Generar número de pedido local
        const pedidoId = 'MP-' + Date.now().toString(36).toUpperCase();
        const fecha = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });

        // Construir líneas de productos
        const lineasProductos = cart.map(item =>
            `  • ${item.name} x${item.quantity} — ${formatCurrency(item.price * item.quantity)}`
        ).join('\n');

        // Mensaje de factura precompletado
        const mensaje =
`🛒 *SOLICITUD DE PEDIDO — MegaWeb Solar*
📋 Ref: ${pedidoId}
📅 Fecha: ${fecha}

*PRODUCTOS SOLICITADOS:*
${lineasProductos}

*RESUMEN:*
  Subtotal:   ${formatCurrency(getSubtotal())}
  IVA (19%): ${formatCurrency(getTax())}
  Envío:       ${getShipping() === 0 ? 'A coordinar' : formatCurrency(getShipping())}
  ─────────────────
  *TOTAL:  ${formatCurrency(getTotal())}*

*DATOS DE ENVÍO:*
  Dirección: ${addressStreet}
  Ciudad: ${addressCity}
  Departamento: ${addressDept}
  Teléfono: ${addressPhone}${user ? `

*CLIENTE:*
  ${user.name} — ${user.email}` : ''}

Por favor confirmar disponibilidad y coordinar el proceso de pago. ¡Gracias! 🌟`;

        const url = `https://wa.me/${EMPRESA_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;

        // Marcar éxito y guardar la URL para el botón
        setOrderId(pedidoId);
        setCheckoutSuccess(true);
        setWhatsappUrl(url);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(value);
    };

    const translateCategory = (cat) => {
        const dict = {
            'PANEL': 'Paneles Solares',
            'INVERTER': 'Inversores',
            'BATTERY': 'Baterías',
            'SERVICE': 'Servicios'
        };
        return dict[cat] || cat;
    };

    return (
        <section id="tienda" className="tienda-section">
            {/* Encabezado */}
            <div className="tienda-header">
                <h2>TIENDA SOLAR</h2>
                <p className="tienda-subtitle">
                    Equipamiento solar y de iluminación inteligente de calidad industrial para tus proyectos de energía.
                </p>

                {/* Barra de acciones horizontal unificada */}
                <div className="tienda-action-bar">

                    {/* Segmento 1: Texto informativo */}
                    <div className="tienda-action-info">
                        <span className="tienda-action-info-icon">💡</span>
                        <span className="tienda-action-info-text">
                            {user
                                ? <>Bienvenido, <strong>{user.name?.split(' ')[0] || user.email}</strong>. Tu carrito está guardado en tu cuenta.</>
                                : <><strong>Inicia sesión</strong> para vincular y guardar tu carrito de compras<br />y asegurar tu proceso de pedido.</>
                            }
                        </span>
                    </div>

                    <div className="tienda-action-divider" />

                    {/* Segmento 2: Botón sesión */}
                    {user ? (
                        <div className="tienda-action-user-pill">
                            <span className="tienda-action-avatar">
                                {user.name ? user.name.charAt(0).toUpperCase() : '👤'}
                            </span>
                            <span>{user.name?.split(' ')[0] || 'Mi cuenta'}</span>
                        </div>
                    ) : (
                        <button className="tienda-btn-login-bar" onClick={() => navigateToLogin('#tienda')}>
                            <span className="tienda-btn-login-icon">👤</span>
                            <span>Iniciar Sesión</span>
                        </button>
                    )}

                    <div className="tienda-action-divider" />

                    {/* Segmento 3: Guía de compra */}
                    <button className="tienda-guide-trigger" onClick={() => setShowGuideModal(true)}>
                        <span className="tienda-guide-icon">🗒️</span>
                        <span className="tienda-guide-texts">
                            <span className="tienda-guide-label">¿Cómo comprar?</span>
                            <span className="tienda-guide-sub">Guía de Compra <span className="tienda-guide-arrow">›</span></span>
                        </span>
                    </button>

                    <div className="tienda-action-divider" />

                    {/* Segmento 4: Carrito */}
                    <button className="tienda-cart-trigger" onClick={() => setShowCartDrawer(true)}>
                        <span className="tienda-cart-icon-wrap">🛒</span>
                        <span className="tienda-cart-label">Mi Carrito</span>
                        {getCartCount() > 0 && (
                            <span className="tienda-cart-badge">{getCartCount()}</span>
                        )}
                        <span className="tienda-cart-chevron">⌄</span>
                    </button>

                </div>
            </div>


            {/* BARRA DE ADMINISTRACIÓN (sólo ADMIN) */}
            {isAdmin && (
                <div className="tienda-admin-bar">
                    <div className="tienda-admin-bar-info">
                        <span className="tienda-admin-badge">⚙ Admin</span>
                        <span>Modo administrador activo — gestionando catálogo de productos</span>
                    </div>
                    <button className="tienda-btn-admin-create" onClick={openCreateProduct}>
                        ＋ Nuevo Producto
                    </button>
                </div>
            )}

            {/* Categorías / Filtros */}
            <div className="tienda-filters">
                {['ALL', 'PANEL', 'INVERTER', 'BATTERY', 'SERVICE'].map(cat => (
                    <button
                        key={cat}
                        className={`tienda-filter-btn ${categoryFilter === cat ? 'tienda-filter-btn--active' : ''}`}
                        onClick={() => handleCategoryFilter(cat)}
                    >
                        {cat === 'ALL' ? 'Todos los Productos' : translateCategory(cat)}
                    </button>
                ))}
            </div>

            {/* Catálogo de Productos */}
            {loading ? (
                <div className="tienda-loading">Cargando catálogo de productos...</div>
            ) : filteredProducts.length === 0 ? (
                <div className="tienda-empty-catalog">
                    <p>No se encontraron productos en esta categoría.</p>
                </div>
            ) : (
                <div className="tienda-grid">
                    {filteredProducts.map(product => (
                        <div key={product.id} className="tienda-card">
                            <div className="tienda-card-img-wrapper">
                                <img src={product.images[0]} alt={product.name} />
                                <span className="tienda-card-category">{translateCategory(product.category)}</span>
                                {isAdmin && (
                                    <div className="tienda-card-admin-actions">
                                        <button
                                            className="tienda-btn-card-edit"
                                            title="Editar producto"
                                            onClick={() => openEditProduct(product)}
                                        >✏️</button>
                                        <button
                                            className="tienda-btn-card-delete"
                                            title="Eliminar producto"
                                            onClick={() => openDeleteConfirm(product)}
                                        >🗑️</button>
                                    </div>
                                )}
                            </div>
                            <div className="tienda-card-info">
                                <h3>{product.name}</h3>
                                <p className="tienda-card-description">{product.description}</p>
                                <div className="tienda-card-meta">
                                    <span className="tienda-card-price">{formatCurrency(product.price)}</span>
                                    <span className={`tienda-card-stock ${product.inventory < 5 ? 'tienda-card-stock--low' : ''}`}>
                                        Stock: {product.inventory} uds
                                    </span>
                                </div>
                                <button
                                    className="tienda-btn-add"
                                    onClick={() => addToCart(product)}
                                    disabled={product.inventory === 0}
                                >
                                    {product.inventory === 0 ? 'Agotado' : 'Añadir al Carrito 🛒'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* CARRO LATERAL (DRAWER) */}
            {showCartDrawer && (
                <div className="tienda-drawer-overlay" onClick={() => setShowCartDrawer(false)}>
                    <div className="tienda-drawer" onClick={e => e.stopPropagation()}>
                        <div className="tienda-drawer-header">
                            <h3>Tu Carrito</h3>
                            <button className="tienda-drawer-close" onClick={() => setShowCartDrawer(false)}>✕</button>
                        </div>

                        {!user && (
                            <div className="tienda-drawer-login-prompt">
                                🔒 <button type="button" onClick={() => { setShowCartDrawer(false); navigateToLogin('#tienda'); }}>Inicia sesión</button> para guardar y conservar tu carrito.
                            </div>
                        )}

                        <div className="tienda-drawer-body">
                            {cart.length === 0 ? (
                                <div className="tienda-drawer-empty">
                                    <div className="tienda-drawer-empty-icon">🛒</div>
                                    <p>Tu carrito está vacío.</p>
                                    <button className="tienda-btn-secondary" onClick={() => setShowCartDrawer(false)}>
                                        Ver Productos
                                    </button>
                                </div>
                            ) : (
                                <div className="tienda-drawer-items">
                                    {cart.map(item => (
                                        <div key={item.id} className="tienda-drawer-item">
                                            <img src={item.images[0]} alt={item.name} />
                                            <div className="tienda-drawer-item-details">
                                                <h4>{item.name}</h4>
                                                <p className="tienda-drawer-item-price">{formatCurrency(item.price)}</p>
                                                <div className="tienda-drawer-item-actions">
                                                    <div className="tienda-qty-selector">
                                                        <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                                                        <span>{item.quantity}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                                                    </div>
                                                    <button className="tienda-btn-remove" onClick={() => removeFromCart(item.id)}>
                                                        Eliminar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {cart.length > 0 && (
                            <div className="tienda-drawer-footer">
                                <div className="tienda-summary-row">
                                    <span>Subtotal:</span>
                                    <span>{formatCurrency(getSubtotal())}</span>
                                </div>
                                <div className="tienda-summary-row">
                                    <span>IVA (19%):</span>
                                    <span>{formatCurrency(getTax())}</span>
                                </div>
                                <div className="tienda-summary-row">
                                    <span>Envío:</span>
                                    <span>{getShipping() === 0 ? 'Gratis' : formatCurrency(getShipping())}</span>
                                </div>
                                <div className="tienda-summary-row tienda-summary-row--total">
                                    <span>Total:</span>
                                    <span>{formatCurrency(getTotal())}</span>
                                </div>
                                <button
                                    className="tienda-btn-checkout"
                                    onClick={() => {
                                        setShowCartDrawer(false);
                                        setShowCheckoutModal(true);
                                    }}
                                >
                                    Proceder al Checkout
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL DE CHECKOUT */}
            {showCheckoutModal && (
                <div className="tienda-modal-overlay" onClick={() => { if (!checkoutLoading) { setShowCheckoutModal(false); setCheckoutSuccess(false); } }}>
                    <div className="tienda-modal" onClick={e => e.stopPropagation()}>
                        <button className="tienda-modal-close" onClick={() => { setShowCheckoutModal(false); setCheckoutSuccess(false); }}>✕</button>

                        {checkoutSuccess ? (
                            <div className="tienda-checkout-success">
                                <div className="tienda-success-icon">✅</div>
                                <h3>¡Factura Lista!</h3>
                                <div className="tienda-order-tag">
                                    Ref. del Pedido: <code>{orderId}</code>
                                </div>
                                <p className="tienda-success-subtext">
                                    Tu factura ha sido generada. Haz clic en el botón para abrirla directamente en WhatsApp — el mensaje ya viene escrito, solo tienes que enviarlo. Nuestro equipo te contactará para coordinar el pago y la entrega.
                                </p>
                                <a
                                    href={whatsappUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="tienda-btn-whatsapp"
                                    onClick={() => { clearCart(); }}
                                >
                                    <span>💬</span>
                                    <span>Enviar Pedido por WhatsApp</span>
                                </a>
                                <button
                                    className="tienda-btn-secondary"
                                    style={{ marginTop: '12px', width: '100%' }}
                                    onClick={() => {
                                        setShowCheckoutModal(false);
                                        setCheckoutSuccess(false);
                                        clearCart();
                                    }}
                                >
                                    Seguir Comprando
                                </button>
                            </div>
                        ) : (
                            <div className="tienda-checkout-form-container">
                                <h3>Finalizar Compra</h3>
                                {user ? (
                                    <p className="tienda-checkout-welcome">Comprando como: <strong>{user.name}</strong> ({user.email})</p>
                                ) : (
                                    <div className="tienda-checkout-guest-warning">
                                        <span>⚠️ Estás realizando tu compra como invitado. <button type="button" onClick={() => { setShowCheckoutModal(false); navigateToLogin('#tienda'); }}>Inicia sesión</button> para asociar tu pedido y guardar tus datos.</span>
                                    </div>
                                )}
                                
                                {orderError && <div className="tienda-auth-error">{orderError}</div>}

                                <form onSubmit={handleCheckoutSubmit} className="tienda-checkout-form">
                                    <h4 className="tienda-form-section-title">Datos de Envío</h4>
                                    <div className="tienda-form-row">
                                        <div className="tienda-form-group">
                                            <label>Calle / Dirección</label>
                                            <input
                                                type="text"
                                                placeholder="Calle 123 # 45-67 Apto 101"
                                                value={addressStreet}
                                                onChange={e => setAddressStreet(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="tienda-form-row">
                                        <div className="tienda-form-group">
                                            <label>Ciudad</label>
                                            <input
                                                type="text"
                                                placeholder="Medellín"
                                                value={addressCity}
                                                onChange={e => setAddressCity(e.target.value)}
                                                required
                                            />
                                        </div>
                                        <div className="tienda-form-group">
                                            <label>Departamento</label>
                                            <input
                                                type="text"
                                                placeholder="Antioquia"
                                                value={addressDept}
                                                onChange={e => setAddressDept(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div className="tienda-form-row">
                                        <div className="tienda-form-group">
                                            <label>Teléfono de Contacto</label>
                                            <input
                                                type="tel"
                                                placeholder="3001234567"
                                                value={addressPhone}
                                                onChange={e => setAddressPhone(e.target.value)}
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="tienda-checkout-summary">
                                        <div className="tienda-summary-row">
                                            <span>Subtotal:</span>
                                            <span>{formatCurrency(getSubtotal())}</span>
                                        </div>
                                        <div className="tienda-summary-row">
                                            <span>IVA (19%):</span>
                                            <span>{formatCurrency(getTax())}</span>
                                        </div>
                                        <div className="tienda-summary-row">
                                            <span>Envío:</span>
                                            <span>{getShipping() === 0 ? 'A coordinar' : formatCurrency(getShipping())}</span>
                                        </div>
                                        <div className="tienda-summary-row tienda-summary-row--total-final">
                                            <span>Total Estimado:</span>
                                            <span>{formatCurrency(getTotal())}</span>
                                        </div>
                                    </div>

                                    <div className="tienda-whatsapp-notice">
                                        <span>💬</span>
                                        <span>Al confirmar, se generará tu factura y se abrirá <strong>WhatsApp</strong> con el pedido escrito. Solo deberás enviar el mensaje para iniciar el proceso.</span>
                                    </div>

                                    <button
                                        type="submit"
                                        className="tienda-btn-whatsapp tienda-btn-full"
                                    >
                                        <span>💬</span>
                                        <span>Generar Factura y Enviar por WhatsApp</span>
                                    </button>
                                </form>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL: GUÍA DE COMPRA / PROCESO DE PEDIDO */}
            {showGuideModal && (
                <div className="tienda-modal-overlay" onClick={() => setShowGuideModal(false)}>
                    <div className="tienda-guide-modal" onClick={e => e.stopPropagation()}>
                        <button className="tienda-modal-close" onClick={() => setShowGuideModal(false)}>✕</button>

                        <div className="tienda-guide-header">
                            <span className="tienda-guide-badge">📋 GUÍA DE COMPRA</span>
                            <h3>¿Cómo hacer tu pedido en MegaWeb?</h3>
                            <p>Sin pasarela de pagos, sin complicaciones. Tu pedido llega directo a nuestro WhatsApp.</p>
                        </div>

                        <div className="tienda-guide-steps">
                            <div className="tienda-guide-step">
                                <div className="tienda-step-number">1</div>
                                <div className="tienda-step-content">
                                    <h4>🛒 Agrega productos al carrito</h4>
                                    <p>Explora el catálogo de paneles solares, inversores, baterías y servicios. Haz clic en <strong>"Añadir al Carrito"</strong> en cada producto que quieras. Puedes ajustar las cantidades dentro del carrito.</p>
                                </div>
                            </div>

                            <div className="tienda-guide-step">
                                <div className="tienda-step-number">2</div>
                                <div className="tienda-step-content">
                                    <h4>👤 Inicia sesión (opcional pero recomendado)</h4>
                                    <p>Si inicias sesión, tu carrito quedará guardado y podrás retomarlo en cualquier momento. También puedes continuar como invitado.</p>
                                </div>
                            </div>

                            <div className="tienda-guide-step">
                                <div className="tienda-step-number">3</div>
                                <div className="tienda-step-content">
                                    <h4>📋 Procede al checkout e ingresa tus datos</h4>
                                    <p>Haz clic en <strong>"Proceder al Checkout"</strong> desde el carrito. Diligencia tu dirección de entrega, ciudad, departamento y teléfono. Estos datos quedarán en tu factura.</p>
                                </div>
                            </div>

                            <div className="tienda-guide-step">
                                <div className="tienda-step-number">4</div>
                                <div className="tienda-step-content">
                                    <h4>💬 Genera tu factura y envíala por WhatsApp</h4>
                                    <p>Al confirmar, se genera automáticamente tu <strong>factura de pedido</strong> y se abre WhatsApp con el mensaje ya escrito — incluyendo productos, cantidades, total y tus datos. <strong>Solo debes pulsar Enviar.</strong></p>
                                </div>
                            </div>

                            <div className="tienda-guide-step">
                                <div className="tienda-step-number">5</div>
                                <div className="tienda-step-content">
                                    <h4>✅ Nuestro equipo coordina el pago y el envío</h4>
                                    <p>Un asesor de MegaWeb recibirá tu pedido por WhatsApp, te confirmará disponibilidad y te indicará las opciones de pago (transferencia, Nequi, efectivo, etc.) y los tiempos de entrega.</p>
                                </div>
                            </div>
                        </div>

                        <div className="tienda-guide-whatsapp-note">
                            <span className="tienda-guide-wa-icon">💬</span>
                            <div>
                                <strong>¿Tienes dudas antes de comprar?</strong>
                                <p>Escríbenos directamente por WhatsApp y con gusto te asesoramos.</p>
                                <a
                                    href="https://wa.me/573126217709?text=Hola%2C%20necesito%20asesor%C3%ADa%20sobre%20los%20productos%20de%20la%20tienda%20solar."
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="tienda-guide-wa-link"
                                >
                                    Contactar asesor →
                                </a>
                            </div>
                        </div>

                        <div className="tienda-guide-footer">
                            <button className="tienda-btn-primary" onClick={() => setShowGuideModal(false)}>
                                ¡Entendido, empezar a comprar! 🚀
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL: CREAR / EDITAR PRODUCTO */}
            {showProductModal && (
                <div className="tienda-product-modal-overlay" onClick={closeProductModal}>
                    <div className="tienda-product-modal" onClick={e => e.stopPropagation()}>
                        <div className="tienda-product-modal-header">
                            <h3>{editingProduct ? '✏️ Editar Producto' : '＋ Nuevo Producto'}</h3>
                            <button className="tienda-product-modal-close" onClick={closeProductModal}>✕</button>
                        </div>

                        {productFormError && (
                            <div className="tienda-form-error" style={{ marginBottom: '16px' }}>{productFormError}</div>
                        )}

                        <form className="tienda-product-form" onSubmit={handleSaveProduct}>
                            <div className="tienda-product-field">
                                <label>Nombre del Producto</label>
                                <input
                                    type="text"
                                    name="name"
                                    placeholder="Ej: Panel Solar Monocristalino 550W"
                                    value={productForm.name}
                                    onChange={handleProductFormChange}
                                    required
                                />
                            </div>

                            <div className="tienda-product-field">
                                <label>Descripción</label>
                                <textarea
                                    name="description"
                                    placeholder="Descripción detallada del producto..."
                                    value={productForm.description}
                                    onChange={handleProductFormChange}
                                    required
                                />
                            </div>

                            <div className="tienda-product-form-row">
                                <div className="tienda-product-field">
                                    <label>Precio</label>
                                    <input
                                        type="number"
                                        name="price"
                                        placeholder="850000"
                                        min="0"
                                        step="any"
                                        value={productForm.price}
                                        onChange={handleProductFormChange}
                                        required
                                    />
                                </div>
                                <div className="tienda-product-field">
                                    <label>Moneda</label>
                                    <select name="currency" value={productForm.currency} onChange={handleProductFormChange}>
                                        <option value="COP">COP — Peso Colombiano</option>
                                        <option value="USD">USD — Dólar</option>
                                    </select>
                                </div>
                            </div>

                            <div className="tienda-product-form-row">
                                <div className="tienda-product-field">
                                    <label>Categoría</label>
                                    <select name="category" value={productForm.category} onChange={handleProductFormChange}>
                                        <option value="PANEL">Paneles Solares</option>
                                        <option value="INVERTER">Inversores</option>
                                        <option value="BATTERY">Baterías</option>
                                        <option value="SERVICE">Servicios</option>
                                    </select>
                                </div>
                                <div className="tienda-product-field">
                                    <label>Inventario (uds)</label>
                                    <input
                                        type="number"
                                        name="inventory"
                                        placeholder="50"
                                        min="0"
                                        value={productForm.inventory}
                                        onChange={handleProductFormChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="tienda-product-field">
                                <label>URL de Imagen</label>
                                <input
                                    type="url"
                                    name="images"
                                    placeholder="https://..."
                                    value={productForm.images}
                                    onChange={handleProductFormChange}
                                />
                            </div>

                            <div className="tienda-product-checkbox-row">
                                <input
                                    type="checkbox"
                                    id="featured-check"
                                    name="featured"
                                    checked={productForm.featured}
                                    onChange={handleProductFormChange}
                                />
                                <label htmlFor="featured-check">Marcar como producto destacado ⭐</label>
                            </div>

                            <div className="tienda-product-form-actions">
                                <button type="button" className="tienda-btn-cancel" onClick={closeProductModal}>
                                    Cancelar
                                </button>
                                <button type="submit" className="tienda-btn-save" disabled={productFormLoading}>
                                    {productFormLoading ? 'Guardando...' : (editingProduct ? 'Guardar Cambios' : 'Crear Producto')}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* MODAL: CONFIRMAR ELIMINACIÓN */}
            {showConfirmDelete && deletingProduct && (
                <div className="tienda-confirm-overlay" onClick={() => !deleteLoading && setShowConfirmDelete(false)}>
                    <div className="tienda-confirm-box" onClick={e => e.stopPropagation()}>
                        <div className="tienda-confirm-icon">🗑️</div>
                        <h4>¿Eliminar Producto?</h4>
                        <p>
                            Estás a punto de eliminar permanentemente <strong>&quot;{deletingProduct.name}&quot;</strong>.
                            Esta acción no se puede deshacer.
                        </p>
                        <div className="tienda-confirm-actions">
                            <button
                                className="tienda-btn-cancel"
                                onClick={() => setShowConfirmDelete(false)}
                                disabled={deleteLoading}
                            >
                                Cancelar
                            </button>
                            <button
                                className="tienda-btn-danger"
                                onClick={handleDeleteProduct}
                                disabled={deleteLoading}
                            >
                                {deleteLoading ? 'Eliminando...' : 'Sí, Eliminar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
}

export default Tienda;
