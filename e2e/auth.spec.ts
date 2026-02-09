import { test, expect } from '@playwright/test';

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;

test.describe('auth', () => {
  test('login with password and navigate to historial', async ({ page }) => {
    test.skip(!email || !password, 'E2E_USER_EMAIL/PASSWORD not set');

    await page.goto('/auth');
    await page.getByRole('tab', { name: 'Contraseña' }).click();
    await page.getByLabel('Correo electrónico').fill(email);
    await page.getByRole('button', { name: 'Continuar' }).click();

    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: 'Entrar' }).click();

    await expect(page).toHaveURL(/\/$/);

    await page.getByRole('link', { name: 'Historial' }).click();
    await expect(page).toHaveURL(/\/historial$/);
    await expect(page.getByRole('heading', { name: 'Historial' })).toBeVisible();
  });
});
