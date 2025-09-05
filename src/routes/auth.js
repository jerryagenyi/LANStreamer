import express from 'express';
import { generateToken, verifyCredentials, authenticateToken } from '../middleware/auth.js';

const router = express.Router();

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
        user: req.user
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