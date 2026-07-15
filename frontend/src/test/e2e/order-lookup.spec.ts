import { test, expect } from '@playwright/test';
import { placeOrder } from './helpers';

const PRODUCT = 'Galletas de Avena y Pasas';
const CUSTOMER = {
  name: 'María Gómez',
  phone: '3009876543',
  address: 'Calle 10 # 5-20, Cumbayá, Quito',
};

test.describe('Búsqueda de pedido sin cuenta', () => {
  test('encuentra un pedido existente con el teléfono correcto', async ({ page }) => {
    const orderNumber = await placeOrder(page, PRODUCT, CUSTOMER);

    await page.goto('/pedidos/buscar');
    await page.getByLabel('Número de orden').fill(orderNumber);
    await page.getByLabel('Teléfono').fill(CUSTOMER.phone);
    await page.getByRole('button', { name: 'Buscar pedido' }).click();

    await page.waitForURL(/\/order\/.+\/success\?lookup=1/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Tu pedido' })).toBeVisible();
    await expect(page.getByText(`Pedido #${orderNumber}`)).toBeVisible();
    await expect(page.getByText('este es el estado actual')).toBeVisible();
  });

  test('rechaza con error genérico cuando el teléfono no coincide', async ({ page }) => {
    const orderNumber = await placeOrder(page, PRODUCT, CUSTOMER);

    await page.goto('/pedidos/buscar');
    await page.getByLabel('Número de orden').fill(orderNumber);
    await page.getByLabel('Teléfono').fill('3000000000');
    await page.getByRole('button', { name: 'Buscar pedido' }).click();

    await expect(page.locator('.form-banner-error')).toBeVisible();
    await expect(page).toHaveURL(/\/pedidos\/buscar/);
  });

  test('rechaza un número de orden inexistente', async ({ page }) => {
    await page.goto('/pedidos/buscar');
    await page.getByLabel('Número de orden').fill('ORD-0000000000000-ZZZZ');
    await page.getByLabel('Teléfono').fill('3000000000');
    await page.getByRole('button', { name: 'Buscar pedido' }).click();

    await expect(page.locator('.form-banner-error')).toBeVisible();
    await expect(page).toHaveURL(/\/pedidos\/buscar/);
  });
});
