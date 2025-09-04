import express from 'express';
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import logger from '../utils/logger.js';
import { ValidationError, ErrorCodes } from '../utils/errors.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Path to contact details config file
const contactConfigPath = path.join(process.cwd(), 'config', 'contact-details.json');

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
    // About section configuration
    showAbout: true,
    aboutSubtitle: '',
    aboutDescription: '',
    showAboutSubtitle: true,
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
            eventTitle, eventSubtitle, showAbout, aboutSubtitle, aboutDescription, showAboutSubtitle
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
            // About section configuration
            showAbout: Boolean(showAbout),
            aboutSubtitle: aboutSubtitle || '',
            aboutDescription: aboutDescription || '',
            showAboutSubtitle: Boolean(showAboutSubtitle),
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

export default router;
