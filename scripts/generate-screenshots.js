/**
 * Screenshot Generator for LANStreamer
 * Automatically captures screenshots of the dashboard and streams pages
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ScreenshotGenerator {
    constructor() {
        this.baseUrl = 'http://localhost:3001';
        this.outputDir = path.join(__dirname, '..', 'images', 'screenshots');
        this.browser = null;
        this.page = null;
    }

    /**
     * Initialize the screenshot generator
     */
    async init() {
        console.log('🚀 Starting LANStreamer Screenshot Generator...');
        
        // Ensure output directory exists
        if (!fs.existsSync(this.outputDir)) {
            fs.mkdirSync(this.outputDir, { recursive: true });
            console.log(`📁 Created screenshots directory: ${this.outputDir}`);
        }

        // Launch browser
        this.browser = await puppeteer.launch({
            headless: 'new',
            defaultViewport: {
                width: 1920,
                height: 1080
            },
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-accelerated-2d-canvas',
                '--no-first-run',
                '--no-zygote',
                '--disable-gpu'
            ]
        });

        this.page = await this.browser.newPage();
        
        // Set user agent
        await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        console.log('✅ Browser initialized');
    }

    /**
     * Wait for server to be ready
     */
    async waitForServer() {
        console.log('⏳ Waiting for LANStreamer server to be ready...');

        let attempts = 0;
        const maxAttempts = 10; // 10 seconds should be enough

        while (attempts < maxAttempts) {
            try {
                const response = await this.page.goto(`${this.baseUrl}/api/health`, {
                    waitUntil: 'domcontentloaded',
                    timeout: 3000
                });

                if (response && response.ok()) {
                    console.log('✅ Server is ready!');
                    return true;
                }
            } catch (error) {
                // Server not ready yet
            }

            attempts++;
            await new Promise(resolve => setTimeout(resolve, 1000));
            console.log(`⏳ Attempt ${attempts}/${maxAttempts}...`);
        }

        throw new Error('❌ Server did not become ready within 10 seconds');
    }

    /**
     * Take screenshot of the dashboard
     */
    async screenshotDashboard() {
        console.log('📸 Taking dashboard screenshot...');
        
        try {
            console.log(`Navigating to dashboard: ${this.baseUrl}/`);
            await this.page.goto(`${this.baseUrl}/`, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            console.log('Waiting for dashboard components to load...');
            // Wait for components to load - use a more generic selector
            await this.page.waitForSelector('body', { timeout: 10000 });
            await new Promise(resolve => setTimeout(resolve, 3000)); // Extra wait for animations
            
            const screenshotPath = path.join(this.outputDir, 'dashboard.png');
            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true,
                type: 'png'
            });
            
            console.log(`✅ Dashboard screenshot saved: ${screenshotPath}`);
            return screenshotPath;
        } catch (error) {
            console.error('❌ Failed to screenshot dashboard:', error.message);
            throw error;
        }
    }

    /**
     * Take screenshot of the streams page
     */
    async screenshotStreams() {
        console.log('📸 Taking streams page screenshot...');

        try {
            console.log(`Navigating to streams page: ${this.baseUrl}/streams.html`);
            await this.page.goto(`${this.baseUrl}/streams.html`, {
                waitUntil: 'domcontentloaded',
                timeout: 30000
            });

            console.log('Waiting for streams page to load...');
            // Wait for page to load and streams to populate
            await this.page.waitForSelector('body', { timeout: 10000 });
            console.log('Waiting for streams container...');
            await this.page.waitForSelector('#streams-container', { timeout: 10000 });
            await new Promise(resolve => setTimeout(resolve, 4000)); // Extra wait for streams to load
            
            const screenshotPath = path.join(this.outputDir, 'streams.png');
            await this.page.screenshot({
                path: screenshotPath,
                fullPage: true,
                type: 'png'
            });
            
            console.log(`✅ Streams screenshot saved: ${screenshotPath}`);
            return screenshotPath;
        } catch (error) {
            console.error('❌ Failed to screenshot streams page:', error.message);
            throw error;
        }
    }

    /**
     * Generate all screenshots
     */
    async generateAll() {
        try {
            await this.init();
            await this.waitForServer();
            
            const screenshots = [];
            screenshots.push(await this.screenshotDashboard());
            screenshots.push(await this.screenshotStreams());
            
            console.log('🎉 All screenshots generated successfully!');
            console.log('📁 Screenshots saved to:', this.outputDir);
            
            return screenshots;
        } catch (error) {
            console.error('❌ Screenshot generation failed:', error.message);
            throw error;
        } finally {
            if (this.browser) {
                await this.browser.close();
                console.log('🔒 Browser closed');
            }
        }
    }

    /**
     * Cleanup
     */
    async cleanup() {
        if (this.browser) {
            await this.browser.close();
        }
    }
}

// CLI usage - Always run when script is executed directly
const generator = new ScreenshotGenerator();

generator.generateAll()
    .then((screenshots) => {
        console.log('\n🎉 Screenshot generation complete!');
        console.log('Generated files:');
        screenshots.forEach(file => console.log(`  - ${file}`));
        process.exit(0);
    })
    .catch((error) => {
        console.error('\n❌ Screenshot generation failed:', error.message);
        process.exit(1);
    });

export default ScreenshotGenerator;
