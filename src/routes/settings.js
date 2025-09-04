import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import multer from 'multer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Path to store application settings
const SETTINGS_DIR = path.join(__dirname, '../../data/settings');
const MUSIC_FILE_SETTING = path.join(SETTINGS_DIR, 'last-music-file.json');
const UPLOADS_DIR = path.join(__dirname, '../../public/uploads/music');

// Configure multer for music file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure uploads directory exists
        fs.ensureDirSync(UPLOADS_DIR);
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        // Keep original filename but add timestamp to prevent conflicts
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}_${timestamp}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 200 * 1024 * 1024 // 200MB limit for music files
    },
    fileFilter: function (req, file, cb) {
        // Check file type
        const allowedTypes = ['.mp3', '.wav', '.ogg', '.m4a'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file format. Allowed: ${allowedTypes.join(', ')}`));
        }
    }
});

// Default settings
const DEFAULT_SETTINGS = {
    music: {
        lastFile: 'default-lobby-music.mp3', // Default system file
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
            console.log('✅ Music settings initialized with no default file');
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

// Music player verification endpoint
router.get('/music/verify', async (req, res) => {
    try {
        // Get current music settings
        let musicSettings = {};
        if (await fs.pathExists(MUSIC_FILE_SETTING)) {
            musicSettings = await fs.readJson(MUSIC_FILE_SETTING);
        } else {
            musicSettings = {
                filename: DEFAULT_SETTINGS.music.lastFile,
                volume: DEFAULT_SETTINGS.music.volume,
                loop: DEFAULT_SETTINGS.music.loop,
                muted: DEFAULT_SETTINGS.music.muted,
                savedAt: new Date().toISOString(),
                isDefault: true
            };
        }

        // Verify if the file exists (only if filename is not null)
        let fileExists = false;
        let fileUrl = null;

        if (musicSettings.filename) {
            if (musicSettings.isUploaded) {
                // Check uploaded files directory
                const uploadsDir = path.join(__dirname, '../../public/uploads/music');
                const filePath = path.join(uploadsDir, musicSettings.filename);
                fileExists = await fs.pathExists(filePath);
                fileUrl = fileExists ? `/uploads/music/${musicSettings.filename}` : null;
            } else {
                // Check assets directory for default files
                const assetsDir = path.join(__dirname, '../../public/assets');
                const filePath = path.join(assetsDir, musicSettings.filename);
                fileExists = await fs.pathExists(filePath);
                fileUrl = fileExists ? `/assets/${musicSettings.filename}` : null;
            }
        }

        res.json({
            success: true,
            settings: musicSettings,
            fileExists,
            fileUrl,
            message: musicSettings.filename ? (fileExists ? 'Music file verified' : 'Music file not found') : 'No music file configured'
        });
    } catch (error) {
        console.error('Error verifying music settings:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to verify music settings',
            settings: null,
            fileExists: false
        });
    }
});

// POST upload music file
router.post('/music/upload', upload.single('musicFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const filename = req.file.filename;
        const originalName = req.file.originalname;
        const fileUrl = `/uploads/music/${filename}`;

        // Save the uploaded file as the current music setting
        const musicSettings = {
            filename: filename,
            originalName: originalName,
            volume: req.body.volume ? parseInt(req.body.volume) : 75,
            loop: req.body.loop !== undefined ? req.body.loop === 'true' : true,
            muted: req.body.muted !== undefined ? req.body.muted === 'true' : false,
            savedAt: new Date().toISOString(),
            isDefault: false,
            isUploaded: true
        };

        await fs.writeJson(MUSIC_FILE_SETTING, musicSettings, { spaces: 2 });

        res.json({
            success: true,
            message: 'Music file uploaded successfully',
            data: {
                filename: filename,
                originalName: originalName,
                fileUrl: fileUrl,
                settings: musicSettings
            }
        });
    } catch (error) {
        console.error('Error uploading music file:', error);

        // Clean up uploaded file if there was an error
        if (req.file) {
            try {
                await fs.remove(req.file.path);
            } catch (cleanupError) {
                console.error('Error cleaning up uploaded file:', cleanupError);
            }
        }

        res.status(500).json({ error: 'Failed to upload music file' });
    }
});

export default router;
