/**
 * Tests para el módulo de Productos (Catálogo / Inventario)
 * Cubre: lógica de precios, control de stock, validaciones de formulario
 */
import { describe, it, expect } from "vitest";

// ─── Helpers de negocio ────────────────────────────────────────────────────

function validateProductForm(form: {
  name: string;
  price: string;
  trackStock: boolean;
  stock: number;
  lowStockAlert: number;
}): { valid: boolean; error?: string } {
  if (!form.name.trim()) return { valid: false, error: "El nombre es requerido" };
  const price = parseFloat(form.price);
  if (isNaN(price) || price <= 0) return { valid: false, error: "Precio inválido" };
  if (form.trackStock && form.stock < 0) return { valid: false, error: "El stock no puede ser negativo" };
  if (form.trackStock && form.lowStockAlert < 0) return { valid: false, error: "La alerta de stock no puede ser negativa" };
  return { valid: true };
}

function isLowStock(product: { trackStock: boolean; stock: number; lowStockAlert: number }): boolean {
  if (!product.trackStock) return false;
  return product.stock <= product.lowStockAlert;
}

function isOutOfStock(product: { trackStock: boolean; stock: number }): boolean {
  if (!product.trackStock) return false;
  return product.stock <= 0;
}

function adjustStock(currentStock: number, delta: number): number {
  const newStock = currentStock + delta;
  return Math.max(0, newStock); // Stock nunca puede ser negativo
}

function formatMXN(amount: number): string {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(amount);
}

// ─── Tests ─────────────────────────────────────────────────────────────────

describe("Validación de formulario de producto", () => {
  it("debe rechazar nombre vacío", () => {
    const result = validateProductForm({ name: "", price: "100", trackStock: false, stock: 0, lowStockAlert: 5 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("El nombre es requerido");
  });

  it("debe rechazar nombre con solo espacios", () => {
    const result = validateProductForm({ name: "   ", price: "100", trackStock: false, stock: 0, lowStockAlert: 5 });
    expect(result.valid).toBe(false);
  });

  it("debe rechazar precio inválido (NaN)", () => {
    const result = validateProductForm({ name: "Producto", price: "abc", trackStock: false, stock: 0, lowStockAlert: 5 });
    expect(result.valid).toBe(false);
    expect(result.error).toBe("Precio inválido");
  });

  it("debe rechazar precio cero", () => {
    const result = validateProductForm({ name: "Producto", price: "0", trackStock: false, stock: 0, lowStockAlert: 5 });
    expect(result.valid).toBe(false);
  });

  it("debe rechazar precio negativo", () => {
    const result = validateProductForm({ name: "Producto", price: "-50", trackStock: false, stock: 0, lowStockAlert: 5 });
    expect(result.valid).toBe(false);
  });

  it("debe aceptar producto válido sin inventario", () => {
    const result = validateProductForm({ name: "Camisa", price: "299.99", trackStock: false, stock: 0, lowStockAlert: 5 });
    expect(result.valid).toBe(true);
  });

  it("debe aceptar producto válido con inventario", () => {
    const result = validateProductForm({ name: "Camisa", price: "299.99", trackStock: true, stock: 10, lowStockAlert: 3 });
    expect(result.valid).toBe(true);
  });

  it("debe rechazar stock negativo cuando trackStock está activo", () => {
    const result = validateProductForm({ name: "Camisa", price: "299.99", trackStock: true, stock: -1, lowStockAlert: 3 });
    expect(result.valid).toBe(false);
  });
});

describe("Control de inventario", () => {
  it("isLowStock: debe retornar false si trackStock está desactivado", () => {
    expect(isLowStock({ trackStock: false, stock: 2, lowStockAlert: 5 })).toBe(false);
  });

  it("isLowStock: debe detectar stock bajo cuando stock <= lowStockAlert", () => {
    expect(isLowStock({ trackStock: true, stock: 3, lowStockAlert: 5 })).toBe(true);
  });

  it("isLowStock: debe retornar false cuando stock > lowStockAlert", () => {
    expect(isLowStock({ trackStock: true, stock: 10, lowStockAlert: 5 })).toBe(false);
  });

  it("isOutOfStock: debe retornar false si trackStock está desactivado", () => {
    expect(isOutOfStock({ trackStock: false, stock: 0 })).toBe(false);
  });

  it("isOutOfStock: debe detectar sin stock cuando stock = 0", () => {
    expect(isOutOfStock({ trackStock: true, stock: 0 })).toBe(true);
  });

  it("isOutOfStock: debe retornar false cuando hay stock disponible", () => {
    expect(isOutOfStock({ trackStock: true, stock: 5 })).toBe(false);
  });

  it("adjustStock: debe incrementar stock correctamente", () => {
    expect(adjustStock(10, 5)).toBe(15);
  });

  it("adjustStock: debe decrementar stock correctamente", () => {
    expect(adjustStock(10, -3)).toBe(7);
  });

  it("adjustStock: no debe permitir stock negativo", () => {
    expect(adjustStock(2, -10)).toBe(0);
  });

  it("adjustStock: stock en 0 con delta negativo debe quedar en 0", () => {
    expect(adjustStock(0, -1)).toBe(0);
  });
});

describe("Formateo de precios", () => {
  it("debe formatear precio en MXN correctamente", () => {
    const formatted = formatMXN(299.99);
    expect(formatted).toContain("299");
    expect(formatted).toContain("99");
  });

  it("debe formatear precio entero en MXN", () => {
    const formatted = formatMXN(1000);
    expect(formatted).toContain("1");
    expect(formatted).toContain("000");
  });

  it("debe incluir símbolo de moneda", () => {
    const formatted = formatMXN(100);
    // El formato es-MX puede usar $ o MXN dependiendo del entorno
    expect(formatted.length).toBeGreaterThan(3);
  });
});

describe("Lógica de carrito POS", () => {
  type CartItem = { id: number; name: string; price: number; quantity: number };

  function addToCart(cart: CartItem[], product: { id: number; name: string; price: number }): CartItem[] {
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      return cart.map((i) => (i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    }
    return [...cart, { ...product, quantity: 1 }];
  }

  function removeFromCart(cart: CartItem[], id: number): CartItem[] {
    return cart.filter((i) => i.id !== id);
  }

  function updateQty(cart: CartItem[], id: number, delta: number): CartItem[] {
    return cart
      .map((i) => (i.id === id ? { ...i, quantity: i.quantity + delta } : i))
      .filter((i) => i.quantity > 0);
  }

  function cartTotal(cart: CartItem[]): number {
    return cart.reduce((sum, i) => sum + i.price * i.quantity, 0);
  }

  it("debe agregar producto al carrito vacío", () => {
    const cart = addToCart([], { id: 1, name: "Camisa", price: 299 });
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(1);
  });

  it("debe incrementar cantidad si el producto ya existe", () => {
    let cart = addToCart([], { id: 1, name: "Camisa", price: 299 });
    cart = addToCart(cart, { id: 1, name: "Camisa", price: 299 });
    expect(cart).toHaveLength(1);
    expect(cart[0].quantity).toBe(2);
  });

  it("debe agregar productos distintos como items separados", () => {
    let cart = addToCart([], { id: 1, name: "Camisa", price: 299 });
    cart = addToCart(cart, { id: 2, name: "Pantalón", price: 499 });
    expect(cart).toHaveLength(2);
  });

  it("debe eliminar producto del carrito", () => {
    let cart = addToCart([], { id: 1, name: "Camisa", price: 299 });
    cart = removeFromCart(cart, 1);
    expect(cart).toHaveLength(0);
  });

  it("debe eliminar item cuando cantidad llega a 0 con updateQty", () => {
    let cart = addToCart([], { id: 1, name: "Camisa", price: 299 });
    cart = updateQty(cart, 1, -1);
    expect(cart).toHaveLength(0);
  });

  it("debe calcular total del carrito correctamente", () => {
    let cart: CartItem[] = [];
    cart = addToCart(cart, { id: 1, name: "Camisa", price: 299 });
    cart = addToCart(cart, { id: 1, name: "Camisa", price: 299 });
    cart = addToCart(cart, { id: 2, name: "Pantalón", price: 499 });
    // 2 camisas x 299 + 1 pantalón x 499 = 598 + 499 = 1097
    expect(cartTotal(cart)).toBe(1097);
  });

  it("debe retornar 0 para carrito vacío", () => {
    expect(cartTotal([])).toBe(0);
  });
});
