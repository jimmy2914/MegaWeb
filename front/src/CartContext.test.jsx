/* eslint-disable react/prop-types */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, act, waitFor } from '@testing-library/react';
import { CartProvider, useCart } from './CartContext';
import { AuthProvider } from './AuthContext';
import { jsonResponse, mockFetch } from './test/renderWithProviders';

let cartApi;
const Probe = () => {
  cartApi = useCart();
  return null;
};

const renderCart = () =>
  render(
    <AuthProvider>
      <CartProvider>
        <Probe />
      </CartProvider>
    </AuthProvider>,
  );

const panel = { id: 'p1', name: 'Panel', price: 100000, inventory: 3 };

afterEach(() => vi.unstubAllGlobals());

describe('CartContext', () => {
  it('useCart fuera del provider lanza un error', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/CartProvider/);
  });

  it('empieza vacío', () => {
    renderCart();
    expect(cartApi.cart).toEqual([]);
    expect(cartApi.getCartCount()).toBe(0);
    expect(cartApi.getShipping()).toBe(0);
  });

  it('addToCart agrega un producto y abre el cajón', () => {
    renderCart();
    act(() => cartApi.addToCart(panel));
    expect(cartApi.cart).toEqual([{ ...panel, quantity: 1 }]);
    expect(cartApi.showCartDrawer).toBe(true);
  });

  it('addToCart suma cantidad si el producto ya está', () => {
    renderCart();
    act(() => cartApi.addToCart(panel));
    act(() => cartApi.addToCart(panel));
    expect(cartApi.cart[0].quantity).toBe(2);
  });

  it('addToCart respeta el inventario', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderCart();
    act(() => cartApi.addToCart({ ...panel, inventory: 1 }));
    act(() => cartApi.addToCart({ ...panel, inventory: 1 }));
    expect(cartApi.cart[0].quantity).toBe(1);
    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('inventario'));
  });

  describe('updateQuantity', () => {
    it('suma y resta cantidades', () => {
      renderCart();
      act(() => cartApi.addToCart(panel));
      act(() => cartApi.updateQuantity('p1', 2));
      expect(cartApi.cart[0].quantity).toBe(3);
      act(() => cartApi.updateQuantity('p1', -1));
      expect(cartApi.cart[0].quantity).toBe(2);
    });

    it('elimina el producto si la cantidad llega a 0', () => {
      renderCart();
      act(() => cartApi.addToCart(panel));
      act(() => cartApi.updateQuantity('p1', -1));
      expect(cartApi.cart).toEqual([]);
    });

    it('no supera el inventario', () => {
      vi.spyOn(window, 'alert').mockImplementation(() => {});
      renderCart();
      act(() => cartApi.addToCart(panel));
      act(() => cartApi.updateQuantity('p1', 10));
      expect(cartApi.cart[0].quantity).toBe(1);
    });

    it('ignora productos que no están en el carrito', () => {
      renderCart();
      act(() => cartApi.addToCart(panel));
      act(() => cartApi.updateQuantity('otro', 1));
      expect(cartApi.cart).toHaveLength(1);
    });
  });

  it('removeFromCart y clearCart vacían el carrito', async () => {
    renderCart();
    act(() => cartApi.addToCart(panel));
    act(() => cartApi.addToCart({ id: 'p2', name: 'Inversor', price: 1, inventory: 5 }));
    act(() => cartApi.removeFromCart('p1'));
    expect(cartApi.cart.map((i) => i.id)).toEqual(['p2']);
    act(() => cartApi.clearCart());
    expect(cartApi.cart).toEqual([]);
    await waitFor(() => expect(localStorage.getItem('mp_cart_guest')).toBe('[]'));
  });

  describe('totales', () => {
    it('calcula subtotal, IVA 19%, envío y total', () => {
      renderCart();
      act(() => cartApi.addToCart(panel));
      act(() => cartApi.updateQuantity('p1', 1));
      expect(cartApi.getCartCount()).toBe(2);
      expect(cartApi.getSubtotal()).toBe(200000);
      expect(cartApi.getTax()).toBeCloseTo(38000);
      expect(cartApi.getShipping()).toBe(50000);
      expect(cartApi.getTotal()).toBeCloseTo(288000);
    });

    it('el envío es gratis sobre 1.500.000', () => {
      renderCart();
      act(() => cartApi.addToCart({ id: 'big', name: 'Batería', price: 2000000, inventory: 5 }));
      expect(cartApi.getShipping()).toBe(0);
    });
  });

  describe('persistencia', () => {
    it('guarda el carrito de invitado en localStorage', async () => {
      renderCart();
      act(() => cartApi.addToCart(panel));
      await waitFor(() => expect(JSON.parse(localStorage.getItem('mp_cart_guest'))).toHaveLength(1));
    });

    it('recupera el carrito de invitado guardado', async () => {
      localStorage.setItem('mp_cart_guest', JSON.stringify([{ ...panel, quantity: 2 }]));
      renderCart();
      await waitFor(() => expect(cartApi.cart[0].quantity).toBe(2));
    });

    it('ignora datos corruptos en localStorage', () => {
      localStorage.setItem('mp_cart_guest', '{no-es-json');
      renderCart();
      expect(cartApi.cart).toEqual([]);
    });

    it('al iniciar sesión fusiona el carrito de invitado con el del usuario', async () => {
      localStorage.setItem('mp_token', 'tok');
      localStorage.setItem('mp_cart_guest', JSON.stringify([{ ...panel, quantity: 1 }, { id: 'p9', price: 5, quantity: 1 }]));
      localStorage.setItem('mp_cart_u1', JSON.stringify([{ ...panel, quantity: 2 }]));
      mockFetch(() => jsonResponse({ id: 'u1', name: 'Ana' }));
      renderCart();
      await waitFor(() => expect(cartApi.cart).toHaveLength(2));
      expect(cartApi.cart.find((i) => i.id === 'p1').quantity).toBe(3);
      expect(localStorage.getItem('mp_cart_guest')).toBeNull();
    });
  });
});
