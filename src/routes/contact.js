import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import multer from 'multer';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { ValidationError, ErrorCodes } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Path to contact details config file
const contactConfigPath = path.join(process.cwd(), 'config', 'contact-details.json');

// Path for event image uploads
const UPLOADS_DIR = path.join(process.cwd(), 'public', 'uploads', 'events');

// Configure multer for event image uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Ensure uploads directory exists
        fs.ensureDirSync(UPLOADS_DIR);
        cb(null, UPLOADS_DIR);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `event_${timestamp}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 2 * 1024 * 1024 // 2MB limit for images
    },
    fileFilter: function (req, file, cb) {
        // Check file type
        const allowedTypes = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedTypes.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported image format. Allowed: ${allowedTypes.join(', ')}`));
        }
    }
});

// Default contact details
const defaultContactDetails = {
    email: '',
    phone: '',
    whatsapp: '',
    showEmail: false,
    showPhone: false,
    showWhatsapp: false,
    // Event configuration
    eventTitle: '',
    eventSubtitle: '',
    eventImage: '',
    // About section configuration
    aboutSubtitle: '',
    aboutDescription: '',
    lastUpdated: new Date().toISOString()
};

/**
 * GET /api/contact-details
 * Get current contact details
 */
router.get('/contact-details', async (req, res) => {
    try {
        logger.contact('Fetching contact details');
        
        // Check if config file exists
        if (await fs.pathExists(contactConfigPath)) {
            const contactDetails = await fs.readJson(contactConfigPath);
            logger.contact('Contact details loaded from config', { 
                hasEmail: !!contactDetails.email,
                hasPhone: !!contactDetails.phone,
                hasWhatsapp: !!contactDetails.whatsapp
            });
            res.json(contactDetails);
        } else {
            // Return default if no config exists
            logger.contact('No contact config found, returning defaults');
            res.json(defaultContactDetails);
        }
    } catch (error) {
        logger.contact.error('Failed to fetch contact details', error);
        res.status(500).json({ 
            error: 'Failed to fetch contact details',
            message: error.message 
        });
    }
});

/**
 * POST /api/contact-details
 * Update contact details
 */
router.post('/contact-details', async (req, res) => {
    try {
        const {
            email, phone, whatsapp, showEmail, showPhone, showWhatsapp,
            eventTitle, eventSubtitle, eventImage, aboutSubtitle, aboutDescription
        } = req.body;
        
        logger.contact('Updating contact details', { 
            hasEmail: !!email,
            hasPhone: !!phone,
            hasWhatsapp: !!whatsapp,
            showEmail,
            showPhone,
            showWhatsapp
        });

        // Validate input
        if (email && !isValidEmail(email)) {
            throw new ValidationError('Invalid email format', ErrorCodes.INVALID_FORMAT);
        }

        if (phone && !isValidPhone(phone)) {
            throw new ValidationError('Invalid phone format', ErrorCodes.INVALID_FORMAT);
        }

        if (whatsapp && !isValidPhone(whatsapp)) {
            throw new ValidationError('Invalid WhatsApp number format', ErrorCodes.INVALID_FORMAT);
        }

        // Prepare contact details
        const contactDetails = {
            email: email || '',
            phone: phone || '',
            whatsapp: whatsapp || '',
            showEmail: Boolean(showEmail),
            showPhone: Boolean(showPhone),
            showWhatsapp: Boolean(showWhatsapp),
            // Event configuration
            eventTitle: eventTitle || '',
            eventSubtitle: eventSubtitle || '',
            eventImage: eventImage || '',
            // About section configuration
            aboutSubtitle: aboutSubtitle || '',
            aboutDescription: aboutDescription || '',
            lastUpdated: new Date().toISOString()
        };

        // Ensure config directory exists
        await fs.ensureDir(path.dirname(contactConfigPath));

        // Save to config file
        await fs.writeJson(contactConfigPath, contactDetails, { spaces: 2 });

        logger.contact('Contact details updated successfully', {
            email: contactDetails.email ? '***@***.***' : 'empty',
            phone: contactDetails.phone ? '***-***-****' : 'empty',
            whatsapp: contactDetails.whatsapp ? '***-***-****' : 'empty'
        });

        res.json({
            success: true,
            message: 'Contact details updated successfully',
            contactDetails
        });

    } catch (error) {
        logger.contact.error('Failed to update contact details', error);
        
        if (error instanceof ValidationError) {
            res.status(400).json({
                error: error.message,
                code: error.code
            });
        } else {
            res.status(500).json({ 
                error: 'Failed to update contact details',
                message: error.message 
            });
        }
    }
});

/**
 * Helper function to validate email format
 */
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

/**
 * Helper function to validate phone format
 * Accepts various formats: +1234567890, (123) 456-7890, 123-456-7890, etc.
 */
function isValidPhone(phone) {
    // Remove all non-digit characters except +
    const cleaned = phone.replace(/[^\d+]/g, '');
    
    // Check if it's a valid phone number (7-15 digits, optionally starting with +)
    const phoneRegex = /^\+?[1-9]\d{6,14}$/;
    return phoneRegex.test(cleaned);
}

/**
 * POST /api/upload-event-image
 * Upload event image
 */
router.post('/upload-event-image', upload.single('eventImage'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded' });
        }

        const filename = req.file.filename;
        const imageUrl = `/uploads/events/${filename}`;

        logger.contact('Event image uploaded successfully', {
            filename,
            originalName: req.file.originalname,
            size: req.file.size
        });

        res.json({
            success: true,
            message: 'Event image uploaded successfully',
            imageUrl: imageUrl
        });
    } catch (error) {
        logger.error('Failed to upload event image:', error);

        // Clean up uploaded file if there was an error
        if (req.file) {
            try {
                await fs.remove(req.file.path);
            } catch (cleanupError) {
                logger.error('Error cleaning up uploaded file:', cleanupError);
            }
        }

        res.status(500).json({
            error: 'Failed to upload event image',
            message: error.message
        });
    }
});

/**
 * POST /api/remove-event-image
 * Remove event image
 */
router.post('/remove-event-image', async (req, res) => {
    try {
        const { imageUrl } = req.body;

        if (!imageUrl) {
            return res.status(400).json({ error: 'Image URL is required' });
        }

        // Extract filename from URL
        const filename = path.basename(imageUrl);
        const filePath = path.join(UPLOADS_DIR, filename);

        // Check if file exists and remove it
        if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
            logger.contact('Event image removed successfully', { filename });
        } else {
            logger.contact('Event image file not found, but continuing', { filename });
        }

        res.json({
            success: true,
            message: 'Event image removed successfully'
        });
    } catch (error) {
        logger.error('Failed to remove event image:', error);
        res.status(500).json({
            error: 'Failed to remove event image',
            message: error.message
        });
    }
});

export default router;
