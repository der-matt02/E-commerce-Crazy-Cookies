import { Page, expect } from '@playwright/test';

export const ADMIN_SUPER = { email: 'admin@crazycookies.com', password: 'Admin123!' };
export const ADMIN_MODERATOR = { email: 'moderator@crazycookies.com', password: 'Moderator123!' };

export type Customer = {
  name: string;
  phone: string;
  address: string;
};

export async function addProductToCartByName(page: Page, productName: string) {
  await page.goto('/products');
  await expect(page.getByRole('heading', { name: 'Catálogo' })).toBeVisible();
  const card = page.locator('article.product-card', { hasText: productName }).first();
  await card.scrollIntoViewIfNeeded();
  await card.getByRole('button', { name: 'Agregar al carrito' }).click();
  // El botón vuelve a su estado inicial ~2s después de agregar, así que en vez de
  // esperar el texto transitorio "agregado" esperamos el badge del carrito (persistente).
  await expect(page.getByLabel('Carrito').locator('.cart-widget__badge')).toBeVisible({
    timeout: 10_000,
  });
}

export async function fillCheckoutForm(page: Page, customer: Customer) {
  await page
    .locator('.form-group', { hasText: 'Nombre completo' })
    .locator('input')
    .fill(customer.name);
  await page.getByPlaceholder('3001234567').fill(customer.phone);
  await page.getByPlaceholder(/Av\. Amazonas/).fill(customer.address);
  await page.getByRole('button', { name: 'Revisar pedido' }).click();
}

/** Adds a product to the cart and completes checkout. Returns the resulting order number. */
export async function placeOrder(page: Page, productName: string, customer: Customer) {
  await addProductToCartByName(page, productName);
  await page.goto('/checkout');
  await fillCheckoutForm(page, customer);

  await expect(page.getByRole('button', { name: 'Confirmar pedido' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirmar pedido' }).click();
  await page.waitForURL(/\/order\/.+\/success/, { timeout: 15_000 });

  const subtitle = page.locator('.status-header__subtitle');
  await expect(subtitle).toBeVisible();
  const text = await subtitle.innerText();
  const match = text.match(/Pedido #(\S+)/);
  if (!match) throw new Error(`No pude extraer el número de orden de: "${text}"`);
  return match[1];
}

export async function loginAsAdmin(page: Page, creds: { email: string; password: string }) {
  await page.goto('/admin/login');
  await page.waitForLoadState('networkidle');
  await page.getByLabel('Email').fill(creds.email);
  await page.getByLabel('Contraseña').fill(creds.password);
  await page.getByRole('button', { name: 'Iniciar sesión' }).click();
  await page.waitForURL(/\/admin\/dashboard/, { timeout: 10_000 });
}
