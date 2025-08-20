/**
 * Basic E2E Tests for LANStreamer Application
 * 
 * This file contains fundamental end-to-end tests that verify the core functionality
 * of the LANStreamer application, including navigation, authentication, and basic UI elements.
 */

const { test, expect } = require('@playwright/test')

test.describe('LANStreamer Basic Functionality', () => {
  test('should load the home page', async ({ page }) => {
    await page.goto('/')
    
    // Check if the page title contains LANStreamer
    await expect(page).toHaveTitle(/LANStreamer/)
    
    // Check if the main heading is visible
    await expect(page.locator('h1')).toBeVisible()
  })

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/')
    
    // Look for login link or button
    const loginButton = page.locator('a[href="/login"], button:has-text("Login")')
    if (await loginButton.count() > 0) {
      await loginButton.click()
      await expect(page).toHaveURL(/.*login/)
    }
  })

  test('should show client interface', async ({ page }) => {
    await page.goto('/client')
    
    // Check if client interface loads
    await expect(page.locator('body')).toBeVisible()
    
    // Should not require authentication for client view
    await expect(page).not.toHaveURL(/.*login/)
  })

  test('should handle 404 pages', async ({ page }) => {
    await page.goto('/non-existent-page')
    
    // Should redirect to 404 page or show 404 content
    const is404 = await page.locator('text=404').count() > 0 ||
                  await page.locator('text=Not Found').count() > 0 ||
                  page.url().includes('/404')
    
    expect(is404).toBeTruthy()
  })
})

test.describe('Authentication Flow', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/login')
    
    // Check for password input (admin login)
    await expect(page.locator('input[type="password"]')).toBeVisible()
    
    // Check for login button
    await expect(page.locator('button:has-text("Login"), input[type="submit"]')).toBeVisible()
  })

  test('should handle invalid login', async ({ page }) => {
    await page.goto('/login')
    
    // Fill in invalid credentials
    await page.fill('input[type="password"]', 'wrongpassword')
    
    // Submit form
    await page.click('button:has-text("Login"), input[type="submit"]')
    
    // Should show error message or stay on login page
    const hasError = await page.locator('text=Invalid').count() > 0 ||
                     await page.locator('.alert-danger').count() > 0 ||
                     page.url().includes('/login')
    
    expect(hasError).toBeTruthy()
  })
})

test.describe('Responsive Design', () => {
  test('should work on mobile devices', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 })
    
    await page.goto('/')
    
    // Check if page is responsive
    await expect(page.locator('body')).toBeVisible()
    
    // Check if navigation adapts to mobile
    const mobileNav = page.locator('.navbar-toggler, .mobile-menu, [data-bs-toggle="collapse"]')
    if (await mobileNav.count() > 0) {
      await expect(mobileNav).toBeVisible()
    }
  })

  test('should work on tablet devices', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 })
    
    await page.goto('/')
    
    // Check if page loads properly on tablet
    await expect(page.locator('body')).toBeVisible()
  })
})

test.describe('Performance and Accessibility', () => {
  test('should load within reasonable time', async ({ page }) => {
    const startTime = Date.now()
    
    await page.goto('/')
    
    const loadTime = Date.now() - startTime
    
    // Should load within 5 seconds
    expect(loadTime).toBeLessThan(5000)
  })

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/')
    
    // Check for viewport meta tag
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content')
    expect(viewport).toContain('width=device-width')
    
    // Check for charset
    const charset = await page.locator('meta[charset]').count()
    expect(charset).toBeGreaterThan(0)
  })
})

test.describe('API Health Check', () => {
  test('should have healthy API', async ({ page }) => {
    // Check if API health endpoint is accessible
    const response = await page.request.get('/api/health')
    expect(response.status()).toBe(200)
    
    const data = await response.json()
    expect(data.success).toBe(true)
  })
})
