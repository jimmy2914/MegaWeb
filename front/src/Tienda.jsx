import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import './Tienda.css';

const API_URL = 'http://localhost:3000/api/v1';

const parseApiError = (data) => {
    if (!data) return 'Error desconocido. Intenta de nuevo.';
    if (Array.isArray(data.message)) return data.message.join(' | ');
    return data.message || data.error || 'Error desconocido. Intenta de nuevo.';
};

function Tienda() {
    const { user, token, navigateToLogin } = useAuth();

    // --- Estado de productos ---
    const [products, setProducts] = useState([]);
    const [filteredProducts, setFilteredProducts] = useState([]);
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);

    // --- Estado del carrito ---
    const [cart, setCart] = useState([]);
    const [showCartDrawer, setShowCartDrawer] = useState(false);

    // Claves de localStorage según el usuario
    const getCartKey = (userId) => userId ? `mp_cart_${userId}` : 'mp_cart_guest';
    const getCheckoutKey = (userId) => userId ? `mp_checkout_${userId}` : 'mp_checkout_guest';

    // --- Estado de checkout y modal ---
    const [showCheckoutModal, setShowCheckoutModal] = useState(false);
    const [checkoutSuccess, setCheckoutSuccess] = useState(false);
    const [orderId, setOrderId] = useState('');
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
    const [paymentMethod, setPaymentMethod] = useState('PAGOS_PSE');

    // --- Consultar productos al montar ---
    useEffect(() => {
        fetchProducts();
    }, []);

    // --- Cargar carrito y checkout según el usuario ---
    useEffect(() => {
        const cartKey = getCartKey(user?.id);
        const savedCart = localStorage.getItem(cartKey);

        if (user?.id) {
            // Fusionar carrito de invitado con el del usuario autenticado si existe
            const guestCartStr = localStorage.getItem('mp_cart_guest');
            let userCartItems = savedCart ? JSON.parse(savedCart) : [];

            if (guestCartStr) {
                try {
                    const guestItems = JSON.parse(guestCartStr);
                    guestItems.forEach(gItem => {
                        const existingIndex = userCartItems.findIndex(uItem => uItem.id === gItem.id);
                        if (existingIndex >= 0) {
                            userCartItems[existingIndex].quantity += gItem.quantity;
                        } else {
                            userCartItems.push(gItem);
                        }
                    });
                } catch (e) {
                    console.error('Error al procesar carrito de invitado:', e);
                }
                localStorage.removeItem('mp_cart_guest');
            }
            setCart(userCartItems);
        } else {
            setCart(savedCart ? JSON.parse(savedCart) : []);
        }

        // Cargar proceso de compra / datos guardados
        const checkoutKey = getCheckoutKey(user?.id);
        const savedCheckout = localStorage.getItem(checkoutKey);
        if (savedCheckout) {
            try {
                const parsed = JSON.parse(savedCheckout);
                setAddressStreet(parsed.street || '');
                setAddressCity(parsed.city || '');
                setAddressDept(parsed.dept || '');
                setAddressPhone(parsed.phone || '');
                setPaymentMethod(parsed.paymentMethod || 'PAGOS_PSE');
            } catch (e) {}
        }
    }, [user?.id]);

    // --- Persistir carrito al cambiar ---
    useEffect(() => {
        const cartKey = getCartKey(user?.id);
        localStorage.setItem(cartKey, JSON.stringify(cart));
    }, [cart, user?.id]);

    // --- Persistir proceso de compra / dirección al cambiar ---
    useEffect(() => {
        const checkoutKey = getCheckoutKey(user?.id);
        const checkoutData = {
            street: addressStreet,
            city: addressCity,
            dept: addressDept,
            phone: addressPhone,
            paymentMethod
        };
        localStorage.setItem(checkoutKey, JSON.stringify(checkoutData));
    }, [addressStreet, addressCity, addressDept, addressPhone, paymentMethod, user?.id]);

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

    // --- Acciones de carrito ---
    const addToCart = (product) => {
        setCart(prevCart => {
            const existing = prevCart.find(item => item.id === product.id);
            if (existing) {
                if (existing.quantity >= product.inventory) {
                    alert('Límite de inventario alcanzado para este producto.');
                    return prevCart;
                }
                return prevCart.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
        setShowCartDrawer(true);
    };

    const updateQuantity = (productId, amount) => {
        setCart(prevCart => {
            return prevCart.map(item => {
                if (item.id === productId) {
                    const newQty = item.quantity + amount;
                    if (newQty <= 0) return null;
                    if (newQty > item.inventory) {
                        alert('Límite de inventario alcanzado.');
                        return item;
                    }
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(Boolean);
        });
    };

    const removeFromCart = (productId) => {
        setCart(prevCart => prevCart.filter(item => item.id !== productId));
    };

    const getCartCount = () => {
        return cart.reduce((sum, item) => sum + item.quantity, 0);
    };

    const getSubtotal = () => {
        return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    };

    const getTax = () => {
        return getSubtotal() * 0.19; // 19% IVA
    };

    const getShipping = () => {
        const sub = getSubtotal();
        if (sub === 0) return 0;
        return sub > 1500000 ? 0 : 50000;
    };

    const getTotal = () => {
        return getSubtotal() + getTax() + getShipping();
    };

    // --- Enviar Pedido ---
    const handleCheckoutSubmit = async (e) => {
        e.preventDefault();
        setOrderError('');

        const activeToken = localStorage.getItem('mp_token');
        if (!activeToken) {
            setOrderError('Debes iniciar sesión para completar tu pedido.');
            return;
        }

        setCheckoutLoading(true);

        const orderData = {
            items: cart.map(item => ({
                productId: item.id,
                quantity: item.quantity
            })),
            paymentMethod: paymentMethod,
            shippingAddress: {
                street: addressStreet,
                city: addressCity,
                department: addressDept,
                phone: addressPhone
            }
        };

        try {
            const res = await fetch(`${API_URL}/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${activeToken}`
                },
                body: JSON.stringify(orderData)
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Error al procesar el pedido');
            
            // Éxito
            setOrderId(data.id);
            setCheckoutSuccess(true);
            setCart([]); // Vaciar carrito
            localStorage.removeItem(getCartKey(user?.id));
        } catch (err) {
            setOrderError(err.message);
        } finally {
            setCheckoutLoading(false);
        }
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

                {/* Aviso de Inicio de Sesión si no está autenticado */}
                {!user && (
                    <div className="tienda-auth-banner">
                        <span>💡 Inicia sesión para vincular y guardar tu carrito de compras y asegurar tu proceso de pedido.</span>
                        <button className="tienda-btn-auth-banner" onClick={() => navigateToLogin('#tienda')}>
                            Iniciar Sesión
                        </button>
                    </div>
                )}

                {/* Carrito Flotante Cabecera */}
                <div className="tienda-cart-trigger-container">
                    <button className="tienda-cart-trigger" onClick={() => setShowCartDrawer(true)}>
                        <span className="tienda-cart-icon">🛒</span>
                        <span className="tienda-cart-text">Mi Carrito</span>
                        {getCartCount() > 0 && (
                            <span className="tienda-cart-badge">{getCartCount()}</span>
                        )}
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
                                <div className="tienda-success-icon">🎉</div>
                                <h3>¡Pedido Realizado con Éxito!</h3>
                                <p>Tu orden ha sido registrada correctamente.</p>
                                <div className="tienda-order-tag">
                                    ID de la Orden: <code>{orderId}</code>
                                </div>
                                <p className="tienda-success-subtext">
                                    Nos pondremos en contacto contigo pronto para coordinar el proceso de pago y el envío.
                                </p>
                                <button
                                    className="tienda-btn-primary"
                                    onClick={() => {
                                        setShowCheckoutModal(false);
                                        setCheckoutSuccess(false);
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
                                    <h4 className="tienda-form-section-title">Dirección de Envío</h4>
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

                                    <h4 className="tienda-form-section-title">Método de Pago</h4>
                                    <div className="tienda-payment-selector">
                                        {[
                                            { id: 'PAGOS_PSE', name: 'PSE / Debito Bancario', icon: '🏦' },
                                            { id: 'CARD', name: 'Tarjeta Crédito / Débito', icon: '💳' },
                                            { id: 'NEQUI', name: 'Nequi / Celular', icon: '📱' },
                                            { id: 'BALOTO', name: 'Efectivo Baloto/Efecty', icon: '💵' }
                                        ].map(method => (
                                            <label
                                                key={method.id}
                                                className={`tienda-payment-option ${paymentMethod === method.id ? 'tienda-payment-option--active' : ''}`}
                                            >
                                                <input
                                                    type="radio"
                                                    name="payment"
                                                    value={method.id}
                                                    checked={paymentMethod === method.id}
                                                    onChange={() => setPaymentMethod(method.id)}
                                                />
                                                <span className="tienda-payment-icon">{method.icon}</span>
                                                <span className="tienda-payment-name">{method.name}</span>
                                            </label>
                                        ))}
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
                                            <span>{getShipping() === 0 ? 'Gratis' : formatCurrency(getShipping())}</span>
                                        </div>
                                        <div className="tienda-summary-row tienda-summary-row--total-final">
                                            <span>Total a Pagar:</span>
                                            <span>{formatCurrency(getTotal())}</span>
                                        </div>
                                    </div>

                                    {!user ? (
                                        <button
                                            type="button"
                                            className="tienda-btn-primary tienda-btn-full"
                                            onClick={() => {
                                                setShowCheckoutModal(false);
                                                navigateToLogin('#tienda');
                                            }}
                                        >
                                            Inicia Sesión para Confirmar Pedido
                                        </button>
                                    ) : (
                                        <button
                                            type="submit"
                                            className="tienda-btn-primary tienda-btn-full"
                                            disabled={checkoutLoading}
                                        >
                                            {checkoutLoading ? 'Procesando Pedido...' : `Confirmar Pedido (${formatCurrency(getTotal())})`}
                                        </button>
                                    )}
                                </form>
                            </div>
                        )}
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
                            Estás a punto de eliminar permanentemente <strong>"{deletingProduct.name}"</strong>.
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
