/* eslint-disable react/prop-types */
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

const getCartKey = (userId) => userId ? `mp_cart_${userId}` : 'mp_cart_guest';

const loadInitialCart = () => {
    try {
        const guestCart = localStorage.getItem('mp_cart_guest');
        if (guestCart && guestCart !== '[]') {
            return JSON.parse(guestCart);
        }
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith('mp_cart_')) {
                const val = localStorage.getItem(k);
                if (val && val !== '[]') {
                    return JSON.parse(val);
                }
            }
        }
        return [];
    } catch {
        return [];
    }
};

export const CartProvider = ({ children }) => {
    const { user } = useAuth();
    const [cart, setCart] = useState(loadInitialCart);
    const [showCartDrawer, setShowCartDrawer] = useState(false);
    const [isLoaded, setIsLoaded] = useState(false);

    // Cargar y fusionar carrito según el usuario autenticado
    useEffect(() => {
        const cartKey = getCartKey(user?.id);
        const saved = localStorage.getItem(cartKey);

        if (user?.id) {
            const guestCartStr = localStorage.getItem('mp_cart_guest');
            let userItems = saved ? JSON.parse(saved) : [];

            if (guestCartStr) {
                try {
                    const guestItems = JSON.parse(guestCartStr);
                    guestItems.forEach(gItem => {
                        const idx = userItems.findIndex(u => u.id === gItem.id);
                        if (idx >= 0) {
                            userItems[idx].quantity += gItem.quantity;
                        } else {
                            userItems.push(gItem);
                        }
                    });
                } catch (err) {
                    console.error('Error al fusionar carrito de invitado:', err);
                }
                localStorage.removeItem('mp_cart_guest');
            }
            setCart(userItems);
        } else if (saved) {
            try {
                setCart(JSON.parse(saved));
            } catch {
                setCart([]);
            }
        }
        setIsLoaded(true);
    }, [user?.id]);

    // Guardar carrito al modificarlo (Únicamente tras terminar la carga inicial)
    useEffect(() => {
        if (!isLoaded) return;
        const cartKey = getCartKey(user?.id);
        localStorage.setItem(cartKey, JSON.stringify(cart));
    }, [cart, user?.id, isLoaded]);

    const addToCart = (product) => {
        setCart(prevCart => {
            const existing = prevCart.find(item => item.id === product.id);
            if (existing) {
                if (product.inventory && existing.quantity >= product.inventory) {
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
                    if (item.inventory && newQty > item.inventory) {
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

    const clearCart = () => {
        setCart([]);
        const cartKey = getCartKey(user?.id);
        localStorage.removeItem(cartKey);
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

    return (
        <CartContext.Provider value={{
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
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const context = useContext(CartContext);
    if (!context) {
        throw new Error('useCart debe utilizarse dentro de un CartProvider');
    }
    return context;
};
