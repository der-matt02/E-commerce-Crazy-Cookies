import { test, expect } from '@playwright/test';
import { addProductToCartByName, fillCheckoutForm, placeOrder } from './helpers';

const PRODUCT = 'Galletas de Chocolate Chip';

test.describe('Flujo de compra', () => {
  test('navega catálogo, ve el detalle de un producto y agrega al carrito', async ({ page }) => {
    await page.goto('/products');
    await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();

    await page.getByRole('link', { name: PRODUCT }).click();
    await expect(page.locator('h1.product-detail__name')).toHaveText(PRODUCT);

    await page.getByRole('button', { name: 'Agregar al carrito' }).click();
    await expect(page.getByLabel('Carrito').locator('.cart-widget__badge')).toBeVisible({
      timeout: 10_000,
    });
  });

  test('agrega producto al carrito y ve el resumen', async ({ page }) => {
    await addProductToCartByName(page, PRODUCT);

    await page.goto('/cart');
    await expect(page.locator('.cart-item__name', { hasText: PRODUCT })).toBeVisible();
    await expect(page.getByText('1 producto')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Proceder al Pago' })).toBeEnabled();
  });

  test('actualiza cantidad y elimina un producto del carrito', async ({ page }) => {
    await addProductToCartByName(page, PRODUCT);
    await page.goto('/cart');

    const item = page.locator('.cart-item', { hasText: PRODUCT });
    await item.locator('.qty-stepper__btn', { hasText: '+' }).click();
    await expect(item.locator('.qty-stepper__value')).toHaveText('2', { timeout: 10_000 });

    await item.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.getByText('Tu carrito está vacío')).toBeVisible();
  });

  test('completa el checkout y llega a la página de confirmación con link de WhatsApp', async ({
    page,
  }) => {
    const orderNumber = await placeOrder(page, PRODUCT, {
      name: 'Juan Pérez',
      phone: '3001234567',
      address: 'Av. Amazonas N12-34, Piso 2, Quito',
    });

    expect(orderNumber).toMatch(/^ORD-/);
    await expect(page.getByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible();
    await expect(page.getByText(`Pedido #${orderNumber}`)).toBeVisible();

    const whatsappLink = page.getByRole('link', { name: /Confirmar pedido por WhatsApp/ });
    await expect(whatsappLink).toHaveAttribute('href', /^https:\/\/wa\.me\//);
    await expect(whatsappLink).toHaveAttribute('target', '_blank');
  });

  test('rechaza un cupón inválido y permite continuar sin descuento', async ({ page }) => {
    await addProductToCartByName(page, PRODUCT);
    await page.goto('/checkout');
    await fillCheckoutForm(page, {
      name: 'Juan Pérez',
      phone: '3001234567',
      address: 'Av. Amazonas N12-34, Piso 2, Quito',
    });

    await page.getByPlaceholder('Código de cupón').fill('NOEXISTE');
    await page.getByRole('button', { name: 'Aplicar' }).click();
    await expect(page.getByText('El cupón no existe')).toBeVisible();

    await page.getByRole('button', { name: 'Confirmar pedido' }).click();
    await page.waitForURL(/\/order\/.+\/success/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: '¡Pedido confirmado!' })).toBeVisible();
  });
});
