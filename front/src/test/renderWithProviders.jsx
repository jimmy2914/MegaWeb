/* eslint-disable react/prop-types */
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider } from '../AuthContext';
import { CartProvider } from '../CartContext';

// Respuesta mínima de fetch para los tests
export const jsonResponse = (body, ok = true, status = ok ? 200 : 400) =>
  Promise.resolve({ ok, status, json: () => Promise.resolve(body) });

export const mockFetch = (handler) => {
  const fn = vi.fn(handler);
  vi.stubGlobal('fetch', fn);
  return fn;
};

export const renderWithProviders = (ui) =>
  render(
    <AuthProvider>
      <CartProvider>{ui}</CartProvider>
    </AuthProvider>,
  );
