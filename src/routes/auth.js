import express from 'express';
import config from '../config/index.js';
import { generateToken, verifyCredentials, authenticateToken, generateCSRFToken } from '../middleware/auth.js';
import { hashPassword, saveSecurityFile, mintJwtSecret } from '../utils/securityStore.js';

const router = express.Router();

// True only while the README-documented defaults are active (no stored hash).
const usingDefaultCredentials = () =>
    !config.security.adminPasswordHash &&
    config.security.adminUsername === 'admin' &&
    config.security.adminPassword === 'lanstreamer123';

/**
 * Login endpoint
 */
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: 'Username and password are required'
            });
        }

        // Verify credentials
        if (verifyCredentials(username, password)) {
            const token = generateToken(username);
            
            res.json({
                message: 'Login successful',
                token,
                user: { username }
            });
        } else {
            res.status(401).json({
                message: 'Invalid username or password'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});

/**
 * Verify token endpoint
 */
router.get('/verify', authenticateToken, (req, res) => {
    res.json({
        message: 'Token is valid',
        user: req.user,
        // First-run hint: tells the dashboard to show the default-credentials
        // banner (what the login is + how to change it) until they're changed.
        usingDefaultCredentials: usingDefaultCredentials()
    });
});

/**
 * Admin account settings (drives the dashboard's "Admin account" card).
 */
router.get('/settings', authenticateToken, (req, res) => {
    res.json({
        username: config.security.adminUsername,
        usingDefaultCredentials: usingDefaultCredentials()
    });
});

/**
 * Change the admin login from inside the app (the packaged-exe path — no .env).
 * Requires the CURRENT password; rotates the JWT secret so every other session
 * is signed out, and returns a fresh token so the operator stays logged in.
 */
router.post('/credentials', authenticateToken, async (req, res) => {
    try {
        const { currentPassword, newUsername, newPassword } = req.body || {};

        if (!verifyCredentials(config.security.adminUsername, currentPassword || '')) {
            // 400, NOT 401: the dashboard's fetch patch reads 401/403 JSON as
            // "session expired" and bounces to /login — a wrong current
            // password is a form error and must stay on the page.
            return res.status(400).json({ message: 'Current password is incorrect' });
        }
        const username = String(newUsername ?? config.security.adminUsername).trim();
        if (username.length < 2) {
            return res.status(400).json({ message: 'Username must be at least 2 characters' });
        }
        if (typeof newPassword !== 'string' || newPassword.length < 8) {
            return res.status(400).json({ message: 'New password must be at least 8 characters' });
        }

        const jwtSecret = mintJwtSecret(); // rotation: old tokens die with the old secret
        const adminPasswordHash = hashPassword(newPassword);
        saveSecurityFile({ adminUsername: username, adminPasswordHash, jwtSecret });

        // Hot-apply: middleware and token generation read config at call time.
        config.security.adminUsername = username;
        config.security.adminPasswordHash = adminPasswordHash;
        config.security.jwtSecret = jwtSecret;

        res.json({
            message: 'Admin login updated — other sessions were signed out',
            token: generateToken(username),
            user: { username },
            usingDefaultCredentials: false
        });
    } catch (error) {
        console.error('Credential change error:', error);
        res.status(500).json({ message: 'Could not update the admin login' });
    }
});

/**
 * Get CSRF token endpoint
 */
router.get('/csrf-token', (req, res) => {
    const csrfToken = generateCSRFToken();
    res.json({
        csrfToken
    });
});

/**
 * Logout endpoint (client-side token removal)
 */
router.post('/logout', (req, res) => {
    res.json({
        message: 'Logged out successfully'
    });
});

export default router;