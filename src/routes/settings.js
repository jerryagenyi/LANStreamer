import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Path to store application settings
const SETTINGS_DIR = path.join(__dirname, '../../data/settings');
const MUSIC_FILE_SETTING = path.join(SETTINGS_DIR, 'last-music-file.json');

// Default settings
const DEFAULT_SETTINGS = {
    music: {
        lastFile: 'Slack-Huddle-Hold-Music_Daniel-Simmons.mp3',
        volume: 75,
        loop: true,
        muted: false
    },
    system: {
        theme: 'dark',
        language: 'en'
    }
};

// Initialize settings system
function initializeSettings() {
    try {
        // Ensure settings directory exists
        fs.ensureDirSync(SETTINGS_DIR);
        
        // Create default music settings if they don't exist
        if (!fs.pathExistsSync(MUSIC_FILE_SETTING)) {
            const defaultMusicSettings = {
                filename: DEFAULT_SETTINGS.music.lastFile,
                volume: DEFAULT_SETTINGS.music.volume,
                loop: DEFAULT_SETTINGS.music.loop,
                muted: DEFAULT_SETTINGS.music.muted,
                savedAt: new Date().toISOString(),
                isDefault: true
            };
            
            fs.writeJsonSync(MUSIC_FILE_SETTING, defaultMusicSettings, { spaces: 2 });
            console.log('✅ Music settings initialized with defaults');
        }
        
        console.log('✅ Settings system initialized');
    } catch (error) {
        console.error('❌ Failed to initialize settings:', error);
    }
}

// Initialize on module load
initializeSettings();

// GET all settings
router.get('/', async (req, res) => {
    try {
        const musicSettings = await fs.pathExists(MUSIC_FILE_SETTING) 
            ? await fs.readJson(MUSIC_FILE_SETTING) 
            : {
                filename: DEFAULT_SETTINGS.music.lastFile,
                volume: DEFAULT_SETTINGS.music.volume,
                loop: DEFAULT_SETTINGS.music.loop,
                muted: DEFAULT_SETTINGS.music.muted,
                savedAt: new Date().toISOString(),
                isDefault: true
            };
        
        const allSettings = {
            music: musicSettings,
            system: DEFAULT_SETTINGS.system,
            version: '1.0.0',
            lastUpdated: new Date().toISOString()
        };
        
        res.json(allSettings);
    } catch (error) {
        console.error('Error reading all settings:', error);
        res.status(500).json({ error: 'Failed to read settings' });
    }
});

// POST reset all settings to defaults
router.post('/reset', async (req, res) => {
    try {
        if (await fs.pathExists(MUSIC_FILE_SETTING)) {
            await fs.remove(MUSIC_FILE_SETTING);
        }
        // Reinitialize with defaults
        initializeSettings();
        res.json({ success: true, message: 'All settings reset to defaults' });
    } catch (error) {
        console.error('Error resetting settings:', error);
        res.status(500).json({ error: 'Failed to reset settings' });
    }
});

// GET music settings
router.get('/music', async (req, res) => {
    try {
        if (await fs.pathExists(MUSIC_FILE_SETTING)) {
            const data = await fs.readJson(MUSIC_FILE_SETTING);
            res.json(data);
        } else {
            // Return defaults if file doesn't exist
            const defaultSettings = {
                filename: DEFAULT_SETTINGS.music.lastFile,
                volume: DEFAULT_SETTINGS.music.volume,
                loop: DEFAULT_SETTINGS.music.loop,
                muted: DEFAULT_SETTINGS.music.muted,
                savedAt: new Date().toISOString(),
                isDefault: true
            };
            res.json(defaultSettings);
        }
    } catch (error) {
        console.error('Error reading music settings:', error);
        // Return defaults on error
        const defaultSettings = {
            filename: DEFAULT_SETTINGS.music.lastFile,
            volume: DEFAULT_SETTINGS.music.volume,
            loop: DEFAULT_SETTINGS.music.loop,
            muted: DEFAULT_SETTINGS.music.muted,
            savedAt: new Date().toISOString(),
            isDefault: true
        };
        res.json(defaultSettings);
    }
});

// GET last played music file (legacy endpoint for backward compatibility)
router.get('/last-music-file', async (req, res) => {
    try {
        if (await fs.pathExists(MUSIC_FILE_SETTING)) {
            const data = await fs.readJson(MUSIC_FILE_SETTING);
            res.json({ filename: data.filename });
        } else {
            res.json({ filename: DEFAULT_SETTINGS.music.lastFile });
        }
    } catch (error) {
        console.error('Error reading music file setting:', error);
        res.json({ filename: DEFAULT_SETTINGS.music.lastFile });
    }
});

// POST save music settings
router.post('/music', async (req, res) => {
    try {
        const { filename, volume, loop, muted } = req.body;
        
        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }
        
        // Read existing settings or use defaults
        let existingSettings = {};
        if (await fs.pathExists(MUSIC_FILE_SETTING)) {
            existingSettings = await fs.readJson(MUSIC_FILE_SETTING);
        }
        
        const data = {
            filename,
            volume: volume !== undefined ? volume : (existingSettings.volume || DEFAULT_SETTINGS.music.volume),
            loop: loop !== undefined ? loop : (existingSettings.loop !== undefined ? existingSettings.loop : DEFAULT_SETTINGS.music.loop),
            muted: muted !== undefined ? muted : (existingSettings.muted !== undefined ? existingSettings.muted : DEFAULT_SETTINGS.music.muted),
            savedAt: new Date().toISOString(),
            isDefault: false
        };
        
        await fs.writeJson(MUSIC_FILE_SETTING, data, { spaces: 2 });
        res.json({ success: true, message: 'Music settings saved', data });
    } catch (error) {
        console.error('Error saving music settings:', error);
        res.status(500).json({ error: 'Failed to save settings' });
    }
});

// POST save last played music file (legacy endpoint for backward compatibility)
router.post('/last-music-file', async (req, res) => {
    try {
        const { filename } = req.body;
        
        if (!filename) {
            return res.status(400).json({ error: 'Filename is required' });
        }
        
        // Read existing settings or use defaults
        let existingSettings = {};
        if (await fs.pathExists(MUSIC_FILE_SETTING)) {
            existingSettings = await fs.readJson(MUSIC_FILE_SETTING);
        }
        
        const data = {
            filename,
            volume: existingSettings.volume || DEFAULT_SETTINGS.music.volume,
            loop: existingSettings.loop !== undefined ? existingSettings.loop : DEFAULT_SETTINGS.music.loop,
            muted: existingSettings.muted !== undefined ? existingSettings.muted : DEFAULT_SETTINGS.music.muted,
            savedAt: new Date().toISOString(),
            isDefault: false
        };
        
        await fs.writeJson(MUSIC_FILE_SETTING, data, { spaces: 2 });
        res.json({ success: true, message: 'Music file preference saved' });
    } catch (error) {
        console.error('Error saving music file setting:', error);
        res.status(500).json({ error: 'Failed to save setting' });
    }
});

// DELETE clear music settings (resets to defaults)
router.delete('/music', async (req, res) => {
    try {
        if (await fs.pathExists(MUSIC_FILE_SETTING)) {
            await fs.remove(MUSIC_FILE_SETTING);
        }
        // Reinitialize with defaults
        initializeSettings();
        res.json({ success: true, message: 'Music settings reset to defaults' });
    } catch (error) {
        console.error('Error clearing music settings:', error);
        res.status(500).json({ error: 'Failed to clear settings' });
    }
});

// DELETE clear last played music file (legacy endpoint for backward compatibility)
router.delete('/last-music-file', async (req, res) => {
    try {
        if (await fs.pathExists(MUSIC_FILE_SETTING)) {
            await fs.remove(MUSIC_FILE_SETTING);
        }
        // Reinitialize with defaults
        initializeSettings();
        res.json({ success: true, message: 'Music file preference cleared' });
    } catch (error) {
        console.error('Error clearing music file setting:', error);
        res.status(500).json({ error: 'Failed to clear setting' });
    }
});

export default router;
