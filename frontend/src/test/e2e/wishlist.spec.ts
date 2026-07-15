import { test, expect } from '@playwright/test';

const PRODUCT = 'Brownie Clásico';

test.describe('Favoritos (wishlist)', () => {
  test('la página de favoritos empieza vacía', async ({ page }) => {
    await page.goto('/favoritos');
    await expect(page.getByRole('heading', { name: 'Mis favoritos' })).toBeVisible();
    await expect(page.getByText('Todavía no tienes productos en favoritos')).toBeVisible();
  });

  test('agrega un producto a favoritos desde el catálogo y aparece en /favoritos', async ({
    page,
  }) => {
    await page.goto('/products');
    const card = page.locator('article.product-card', { hasText: PRODUCT }).first();
    const wishlistBtn = card.getByRole('button', { name: 'Agregar a favoritos' });
    await wishlistBtn.click();
    await expect(card.getByRole('button', { name: 'Quitar de favoritos' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await page.goto('/favoritos');
    await expect(page.locator('.product-card__name', { hasText: PRODUCT })).toBeVisible();
  });

  test('quita un producto de favoritos y vuelve a mostrar el estado vacío', async ({ page }) => {
    await page.goto('/products');
    const card = page.locator('article.product-card', { hasText: PRODUCT }).first();
    await card.getByRole('button', { name: 'Agregar a favoritos' }).click();
    await expect(card.getByRole('button', { name: 'Quitar de favoritos' })).toBeVisible();

    await page.goto('/favoritos');
    const favCard = page.locator('article.product-card', { hasText: PRODUCT });
    await expect(favCard).toBeVisible();
    await favCard.getByRole('button', { name: 'Quitar de favoritos' }).click();

    await expect(page.getByText('Todavía no tienes productos en favoritos')).toBeVisible();
  });

  test('el botón de favoritos también funciona desde el detalle de producto', async ({ page }) => {
    await page.goto('/products');
    await page.getByRole('link', { name: PRODUCT }).click();
    await page.waitForURL(/\/products\/.+/);
    await expect(page.locator('h1.product-detail__name')).toHaveText(PRODUCT);

    const detailBtn = page.getByRole('button', { name: 'Agregar a favoritos' });
    await detailBtn.click();
    await expect(page.getByRole('button', { name: 'Quitar de favoritos' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await page.goto('/favoritos');
    await expect(page.locator('.product-card__name', { hasText: PRODUCT })).toBeVisible();
  });
});
