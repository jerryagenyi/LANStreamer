import { test, expect } from '@playwright/test'

test.describe('LANStreamer Full Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Capture console logs
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    // Navigate to the dashboard
    await page.goto('/dashboard')
    
    // Wait for the dashboard to load
    await page.waitForSelector('h1:has-text("LANStreamer Dashboard")')
  })

  test('should start a real audio stream and make it available for listening', async ({ page }) => {
    // Wait for audio devices to load
    await page.waitForSelector('.audio-devices-list', { timeout: 10000 })
    
    // Verify we have at least one audio device
    const deviceItems = await page.locator('.audio-device-item').count()
    expect(deviceItems).toBeGreaterThan(0)
    
    // Get the first available device
    const firstDevice = page.locator('.audio-device-item').first()
    const deviceName = await firstDevice.locator('.device-name').textContent()
    
    // Click start stream button
    await firstDevice.locator('button:has-text("Start Stream")').click()
    
    // Wait for stream to start (this should now spawn a real FFmpeg process)
    await page.waitForSelector('.stream-item', { timeout: 15000 })
    
    // Verify stream status shows as "Live"
    const streamStatus = page.locator('.stream-item .status-indicator')
    await expect(streamStatus).toContainText('Live')
    
    // Verify the stream appears in active streams section
    const activeStreams = page.locator('.stream-item')
    await expect(activeStreams).toHaveCount(1)
    
    // Navigate to the client/listener page
    await page.goto('/client')
    
    // Wait for the client page to load
    await page.waitForSelector('h1:has-text("LANStreamer Audio Streams")')
    
    // Verify the stream is listed and available for listening
    const streamCard = page.locator('.stream-card').first()
    await expect(streamCard).toBeVisible()
    
    // Verify stream name matches what we started
    const streamName = await streamCard.locator('.stream-name').textContent()
    expect(streamName).toContain(deviceName)
    
    // Verify stream shows as "Live"
    const liveStatus = page.locator('.status-badge.status-live')
    await expect(liveStatus).toBeVisible()
    
    // Click play button to start listening
    await streamCard.locator('button:has-text("Play")').click()
    
    // Verify the stream is now playing
    await expect(streamCard.locator('button:has-text("Stop")')).toBeVisible()
    
    // Verify progress bar appears
    await expect(streamCard.locator('.stream-progress')).toBeVisible()
  })

  test('should stop a running stream and remove it from active streams', async ({ page }) => {
    // Wait for audio devices to load
    await page.waitForSelector('.audio-devices-list', { timeout: 10000 })
    
    // Start a stream first
    const firstDevice = page.locator('.audio-device-item').first()
    await firstDevice.locator('button:has-text("Start Stream")').click()
    
    // Wait for stream to start
    await page.waitForSelector('.stream-item', { timeout: 15000 })
    
    // Verify stream is running
    await expect(page.locator('.stream-item .status-indicator')).toContainText('Live')
    
    // Stop the stream
    await page.locator('.stream-item button:has-text("Stop")').click()
    
    // Wait for stream to stop and disappear
    await page.waitForSelector('.stream-item', { state: 'hidden', timeout: 10000 })
    
    // Verify no active streams remain
    await expect(page.locator('.stream-item')).toHaveCount(0)
    
    // Verify the "No active streams" message appears
    await expect(page.locator('text=No active streams')).toBeVisible()
  })

  test('should handle multiple concurrent streams', async ({ page }) => {
    // Wait for audio devices to load
    await page.waitForSelector('.audio-devices-list', { timeout: 10000 })
    
    // Get all available devices
    const deviceItems = page.locator('.audio-device-item')
    const deviceCount = await deviceItems.count()
    
    if (deviceCount >= 2) {
      // Start first stream
      await deviceItems.first().locator('button:has-text("Start Stream")').click()
      await page.waitForSelector('.stream-item', { timeout: 15000 })
      
      // Start second stream
      await deviceItems.nth(1).locator('button:has-text("Start Stream")').click()
      await page.waitForSelector('.stream-item', { timeout: 15000 })
      
      // Verify both streams are running
      const activeStreams = page.locator('.stream-item')
      await expect(activeStreams).toHaveCount(2)
      
      // Use "Stop All Streams" button
      await page.locator('button:has-text("Stop All Streams")').click()
      
      // Wait for all streams to stop
      await page.waitForSelector('.stream-item', { state: 'hidden', timeout: 15000 })
      
      // Verify no streams remain
      await expect(page.locator('.stream-item')).toHaveCount(0)
    }
  })

  test('should maintain stream stability during extended operation', async ({ page }) => {
    // Wait for audio devices to load
    await page.waitForSelector('.audio-devices-list', { timeout: 10000 })
    
    // Start a stream
    const firstDevice = page.locator('.audio-device-item').first()
    await firstDevice.locator('button:has-text("Start Stream")').click()
    
    // Wait for stream to start
    await page.waitForSelector('.stream-item', { timeout: 15000 })
    
    // Verify stream remains stable for at least 30 seconds
    // This tests that the real FFmpeg process doesn't crash
    await page.waitForTimeout(30000)
    
    // Verify stream is still running
    await expect(page.locator('.stream-item .status-indicator')).toContainText('Live')
    
    // Stop the stream
    await page.locator('.stream-item button:has-text("Stop")').click()
    await page.waitForSelector('.stream-item', { state: 'hidden', timeout: 10000 })
  })
})
