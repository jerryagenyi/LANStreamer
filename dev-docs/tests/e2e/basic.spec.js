import { test, expect } from '@playwright/test';

test.describe('LANStreamer Dashboard', () => {
  test('should display the main heading and the list of audio devices', async ({ page }) => {
    // Navigate to the base URL defined in playwright.config.js
    await page.goto('/');

    // 1. Check for the main dashboard heading
    await expect(page.locator('h1')).toHaveText('LANStreamer Dashboard');

    // 2. Check for the list of audio devices from our mock service.
    // Playwright will wait for these elements to become visible.
    await expect(page.locator('text=Microphone (Realtek Audio)')).toBeVisible();
    await expect(page.locator('text=Line In (Behringer UMC404HD 192k)')).toBeVisible();
    await expect(page.locator('text=CABLE Output (VB-Audio Virtual Cable)')).toBeVisible();
  });
});