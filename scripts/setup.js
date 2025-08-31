#!/usr/bin/env node

/**
 * LANStreamer Setup Script
 * Initializes the application for first-time use
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
    log(`✅ ${message}`, 'green');
}

function logWarning(message) {
    log(`⚠️  ${message}`, 'yellow');
}

function logError(message) {
    log(`❌ ${message}`, 'red');
}

function logInfo(message) {
    log(`ℹ️  ${message}`, 'blue');
}

async function setupApplication() {
    log('🚀 Starting LANStreamer Setup...', 'bright');
    
    try {
        const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const rootDir = path.resolve(__dirname, '..');
        
        // 1. Create data directory structure
        logInfo('Creating data directory structure...');
        const dataDir = path.join(rootDir, 'data');
        const settingsDir = path.join(dataDir, 'settings');
        const uploadsDir = path.join(dataDir, 'uploads');
        const logsDir = path.join(dataDir, 'logs');
        
        await fs.ensureDir(dataDir);
        await fs.ensureDir(settingsDir);
        await fs.ensureDir(uploadsDir);
        await fs.ensureDir(logsDir);
        
        logSuccess('Data directories created');
        
        // 2. Initialize default settings
        logInfo('Initializing default settings...');
        const defaultSettings = {
            filename: 'Slack-Huddle-Hold-Music_Daniel-Simmons.mp3',
            volume: 75,
            loop: true,
            muted: false,
            savedAt: new Date().toISOString(),
            isDefault: true
        };
        
        const musicSettingsFile = path.join(settingsDir, 'last-music-file.json');
        await fs.writeJson(musicSettingsFile, defaultSettings, { spaces: 2 });
        logSuccess('Default music settings created');
        
        // 3. Create .gitkeep files to preserve empty directories
        logInfo('Preserving directory structure in git...');
        await fs.writeFile(path.join(uploadsDir, '.gitkeep'), '');
        await fs.writeFile(path.join(logsDir, '.gitkeep'), '');
        logSuccess('Directory structure preserved');
        
        // 4. Check if .env exists
        const envFile = path.join(rootDir, '.env');
        if (!await fs.pathExists(envFile)) {
            logWarning('.env file not found. Please copy .env.example to .env and configure your settings.');
        } else {
            logSuccess('.env file found');
        }
        
        // 5. Verify assets exist
        const assetsDir = path.join(rootDir, 'public', 'assets');
        if (await fs.pathExists(assetsDir)) {
            logSuccess('Assets directory found');
        } else {
            logWarning('Assets directory not found. Some features may not work properly.');
        }
        
        log('🎉 LANStreamer setup completed successfully!', 'bright');
        log('📁 Data directory: ' + dataDir, 'cyan');
        log('⚙️  Settings file: ' + musicSettingsFile, 'cyan');
        log('🚀 Run "npm start" to start the application', 'green');
        
    } catch (error) {
        logError('Setup failed: ' + error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run setup if called directly
setupApplication();
