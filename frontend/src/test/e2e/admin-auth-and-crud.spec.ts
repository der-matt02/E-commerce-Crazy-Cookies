import { test, expect } from '@playwright/test';
import { ADMIN_SUPER, loginAsAdmin } from './helpers';

test.describe('Admin — autenticación', () => {
  test('rechaza credenciales incorrectas con un error visible', async ({ page }) => {
    await page.goto('/admin/login');
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Email').fill(ADMIN_SUPER.email);
    await page.getByLabel('Contraseña').fill('ContraseñaIncorrecta1!');
    await page.getByRole('button', { name: 'Iniciar sesión' }).click();

    await expect(page.getByText('Credenciales incorrectas')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('redirige a login al intentar entrar a una ruta protegida sin sesión', async ({ page }) => {
    await page.goto('/admin/products');
    await page.waitForURL(/\/admin\/login/, { timeout: 10_000 });
    await expect(page.getByRole('heading', { name: 'Admin Panel' })).toBeVisible();
  });

  test('permite iniciar sesión y navegar el panel, y luego cerrar sesión', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_SUPER);
    await expect(page.getByText(ADMIN_SUPER.email)).toBeVisible();
    await expect(page.getByRole('link', { name: /Productos/ })).toBeVisible();

    await page.getByRole('button', { name: /Cerrar sesión/ }).click();
    await page.waitForURL(/\/admin\/login/, { timeout: 10_000 });
  });
});

test.describe('Admin — CRUD de cupones', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page, ADMIN_SUPER);
    await page.goto('/admin/coupons');
    await expect(page.getByRole('heading', { name: 'Cupones' })).toBeVisible();
  });

  test('crea, edita y elimina un cupón', async ({ page }) => {
    const code = `E2E${Date.now()}`;

    // Crear
    await page.getByRole('button', { name: '+ Nuevo Cupón' }).click();
    const createModal = page.locator('div.fixed', { hasText: 'Nuevo Cupón' });
    await createModal.getByPlaceholder('VERANO10').fill(code);
    await createModal.locator('input[type="number"]').nth(0).fill('15');
    await createModal.getByRole('button', { name: 'Crear Cupón' }).click();
    await expect(createModal).not.toBeVisible();

    const row = page.locator('tr', { hasText: code });
    await expect(row).toBeVisible();
    await expect(row).toContainText('15%');
    await expect(row).toContainText('Activo');

    // Editar
    await row.getByRole('button', { name: 'Editar' }).click();
    const editModal = page.locator('div.fixed', { hasText: 'Editar Cupón' });
    await editModal.locator('input[type="number"]').nth(0).fill('25');
    await editModal.getByRole('button', { name: 'Guardar Cambios' }).click();
    await expect(editModal).not.toBeVisible();
    await expect(row).toContainText('25%');

    // Eliminar
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.locator('tr', { hasText: code })).toHaveCount(0);
  });

  test('cancela la eliminación de un cupón cuando se rechaza el diálogo de confirmación', async ({
    page,
  }) => {
    const code = `E2ECANCEL${Date.now()}`;

    await page.getByRole('button', { name: '+ Nuevo Cupón' }).click();
    const createModal = page.locator('div.fixed', { hasText: 'Nuevo Cupón' });
    await createModal.getByPlaceholder('VERANO10').fill(code);
    await createModal.locator('input[type="number"]').nth(0).fill('10');
    await createModal.getByRole('button', { name: 'Crear Cupón' }).click();
    await expect(createModal).not.toBeVisible();

    const row = page.locator('tr', { hasText: code });
    await expect(row).toBeVisible();

    page.once('dialog', (dialog) => dialog.dismiss());
    await row.getByRole('button', { name: 'Eliminar' }).click();
    await expect(row).toBeVisible();

    // limpieza: sí se elimina para no ensuciar la base de datos de test
    page.once('dialog', (dialog) => dialog.accept());
    await row.getByRole('button', { name: 'Eliminar' }).click();
    await expect(page.locator('tr', { hasText: code })).toHaveCount(0);
  });
});
