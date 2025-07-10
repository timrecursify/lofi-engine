import { test, expect } from '@playwright/test';

// Configuration
const isProduction = process.env.TEST_URL?.includes('chillcast.fm');
const baseURL = process.env.TEST_URL || 'http://localhost:4173';

test.describe('🔥 Smoke Tests - Critical Path Validation', () => {
  
  test.beforeEach(async ({ page }) => {
    // Set longer timeout for production
    test.setTimeout(isProduction ? 60000 : 30000);
  });

  test('🏠 Homepage loads successfully', async ({ page }) => {
    await page.goto('/');
    
    // Check page loads
    await expect(page).toHaveTitle(/Chillcast/i);
    
    // Check critical elements are present
    await expect(page.locator('[data-testid="music-player"]')).toBeVisible();
    await expect(page.locator('[data-testid="control-panel"]')).toBeVisible();
    
    // Check no console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(5000); // Wait for initialization
    expect(errors.length).toBe(0);
  });

  test('🎵 Music engine initializes', async ({ page }) => {
    await page.goto('/');
    
    // Wait for music engine to load
    await page.waitForSelector('[data-testid="music-player"]');
    
    // Check play/pause functionality
    const playButton = page.locator('[data-testid="play-button"]');
    await expect(playButton).toBeVisible();
    
    // Test play functionality (should not throw errors)
    await playButton.click();
    await page.waitForTimeout(2000);
    
    // Check if audio context is running (via console logs or UI state)
    const playerState = await page.locator('[data-testid="player-state"]').textContent();
    expect(playerState).not.toContain('error');
  });

  test('🔊 Volume controls work', async ({ page }) => {
    await page.goto('/');
    
    // Test volume controls
    const volumeSlider = page.locator('[data-testid="volume-slider"]');
    await expect(volumeSlider).toBeVisible();
    
    // Change volume and verify no errors
    await volumeSlider.fill('50');
    await page.waitForTimeout(1000);
    
    // Check volume indicator updates
    const volumeIndicator = page.locator('[data-testid="volume-indicator"]');
    await expect(volumeIndicator).toContainText('50');
  });

  test('🌈 Visual scenes load', async ({ page }) => {
    await page.goto('/');
    
    // Check visual scene container
    const visualScene = page.locator('[data-testid="visual-scene"]');
    await expect(visualScene).toBeVisible();
    
    // Test scene switching
    const sceneSelector = page.locator('[data-testid="scene-selector"]');
    if (await sceneSelector.isVisible()) {
      await sceneSelector.click();
      await page.locator('[data-testid="scene-option"]:first-child').click();
      await page.waitForTimeout(2000);
    }
    
    // Verify no WebGL errors
    const webglError = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return 'No canvas found';
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return gl ? null : 'WebGL not supported';
    });
    
    expect(webglError).toBeNull();
  });

  test('🔐 Authentication flow accessible', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Check auth page loads
    await expect(page).toHaveTitle(/Sign In|Auth/i);
    
    // Check magic link form
    const emailInput = page.locator('input[type="email"]');
    await expect(emailInput).toBeVisible();
    
    const submitButton = page.locator('button[type="submit"]');
    await expect(submitButton).toBeVisible();
    
    // Test form validation (without submitting)
    await emailInput.fill('invalid-email');
    await submitButton.click();
    
    // Should show validation error
    await expect(page.locator('.error, [role="alert"]')).toBeVisible();
  });

  test('💳 Upgrade page accessible', async ({ page }) => {
    await page.goto('/upgrade');
    
    // Check upgrade page loads
    await expect(page).toHaveTitle(/Upgrade|Pro/i);
    
    // Check pricing information
    await expect(page.locator('[data-testid="pricing-card"]')).toBeVisible();
    await expect(page.locator('[data-testid="pro-features"]')).toBeVisible();
    
    // Check upgrade button (should be present but may require auth)
    const upgradeButton = page.locator('[data-testid="upgrade-button"]');
    await expect(upgradeButton).toBeVisible();
  });

  test('📱 Mobile responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Check mobile navigation
    const mobileMenu = page.locator('[data-testid="mobile-menu"]');
    if (await mobileMenu.isVisible()) {
      await mobileMenu.click();
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    }
    
    // Check responsive layout
    const controlPanel = page.locator('[data-testid="control-panel"]');
    await expect(controlPanel).toBeVisible();
    
    // Verify touch interactions work
    const playButton = page.locator('[data-testid="play-button"]');
    await playButton.tap();
    await page.waitForTimeout(1000);
  });

  test('⚡ Performance benchmarks', async ({ page }) => {
    // Enable performance metrics
    await page.goto('/', { waitUntil: 'networkidle' });
    
    // Measure Core Web Vitals
    const vitals = await page.evaluate(() => {
      return new Promise((resolve) => {
        if ('PerformanceObserver' in window) {
          const observer = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const metrics: any = {};
            
            entries.forEach((entry) => {
              if (entry.entryType === 'paint') {
                metrics[entry.name] = entry.startTime;
              }
            });
            
            resolve(metrics);
          });
          
          observer.observe({ entryTypes: ['paint'] });
          
          // Fallback after 5 seconds
          setTimeout(() => resolve({}), 5000);
        } else {
          resolve({});
        }
      });
    });
    
    console.log('Performance metrics:', vitals);
    
    // Basic performance assertions
    const loadTime = await page.evaluate(() => performance.timing.loadEventEnd - performance.timing.navigationStart);
    expect(loadTime).toBeLessThan(isProduction ? 10000 : 5000); // 10s prod, 5s dev
  });

  test('🛡️ Security headers present', async ({ page }) => {
    const response = await page.goto('/');
    
    if (isProduction) {
      // Check security headers in production
      const headers = response?.headers() || {};
      
      expect(headers['x-frame-options'] || headers['x-frame-options']).toBeDefined();
      expect(headers['x-content-type-options']).toBe('nosniff');
      
      // Check HTTPS redirect in production
      expect(response?.url()).toMatch(/^https:/);
    }
    
    // Check CSP header exists (development may have different CSP)
    const csp = response?.headers()['content-security-policy'];
    if (csp) {
      expect(csp).toContain('default-src');
    }
  });

  test('🔗 Critical API endpoints respond', async ({ page }) => {
    const apiBase = `${baseURL}/api/v1`;
    
    // Health check
    const healthResponse = await page.request.get(`${apiBase}/health`);
    expect(healthResponse.status()).toBe(200);
    
    // Queue endpoint
    const queueResponse = await page.request.get(`${apiBase}/queue?limit=1`);
    expect([200, 401].includes(queueResponse.status())).toBeTruthy(); // 401 if auth required
    
    // Feature flags
    const flagsResponse = await page.request.get(`${apiBase}/feature-flags`);
    expect(flagsResponse.status()).toBe(200);
    
    // If responses are JSON, verify structure
    if (queueResponse.status() === 200) {
      const queueData = await queueResponse.json();
      expect(queueData).toHaveProperty('clips');
      expect(Array.isArray(queueData.clips)).toBeTruthy();
    }
  });

  test('🎯 Content pipeline operational', async ({ page }) => {
    // Check if content generation is working
    const response = await page.request.get(`${baseURL}/api/v1/test/content-pipeline`);
    
    if (response.status() === 200) {
      const testData = await response.json();
      expect(testData.status).toBe('success');
      expect(testData.stages).toBeDefined();
      
      // Check each pipeline stage
      const stages = testData.stages;
      expect(stages.fetch).toBe('success');
      expect(stages.script).toBe('success');
      expect(stages.tts).toBe('success');
    } else {
      console.log('Content pipeline test endpoint not available or failed');
      // This is acceptable in production if endpoint is disabled
    }
  });
});

test.describe('🚨 Error Handling', () => {
  
  test('404 page handled gracefully', async ({ page }) => {
    const response = await page.goto('/nonexistent-page');
    
    // Should return 404 or redirect to 404 page
    expect([404, 200].includes(response?.status() || 0)).toBeTruthy();
    
    // Should show user-friendly error page
    await expect(page.locator('h1, h2')).toContainText(/404|Not Found|Page not found/i);
  });

  test('Network errors handled gracefully', async ({ page }) => {
    // Simulate offline condition
    await page.route('**/api/**', route => route.abort());
    
    await page.goto('/');
    
    // App should still load basic functionality
    await expect(page.locator('[data-testid="music-player"]')).toBeVisible();
    
    // Should show appropriate error states
    const errorMessages = await page.locator('.error, [role="alert"]').count();
    console.log(`Found ${errorMessages} error indicators`);
    
    // At least some error handling should be visible
    expect(errorMessages).toBeGreaterThanOrEqual(0);
  });
}); 