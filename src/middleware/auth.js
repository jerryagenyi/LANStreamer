import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Authentication middleware for protecting admin routes
 */
export const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ 
            message: 'Access token required',
            redirect: '/login.html'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        console.log('Token verification failed:', error.message);
        return res.status(403).json({ 
            message: 'Invalid or expired token',
            redirect: '/login.html'
        });
    }
};

/**
 * Optional authentication - doesn't fail if no token
 */
export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded;
        } catch (error) {
            // Token invalid, but continue without user
            req.user = null;
        }
    } else {
        req.user = null;
    }
    
    next();
};

/**
 * Generate JWT token for authenticated user
 */
export const generateToken = (username) => {
    return jwt.sign(
        { username, type: 'admin' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );
};

/**
 * Verify admin credentials
 */
export const verifyCredentials = (username, password) => {
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const adminPassword = process.env.ADMIN_PASSWORD || 'lanstreamer123';

    return username === adminUsername && password === adminPassword;
};

// Store for CSRF tokens (in production, use Redis or database)
const csrfTokens = new Map();

/**
 * Generate CSRF token
 */
export const generateCSRFToken = () => {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = Date.now() + (60 * 60 * 1000); // 1 hour
    csrfTokens.set(token, expires);

    // Clean up expired tokens
    for (const [key, expiry] of csrfTokens.entries()) {
        if (expiry < Date.now()) {
            csrfTokens.delete(key);
        }
    }

    return token;
};

/**
 * Verify CSRF token
 */
export const verifyCSRFToken = (token) => {
    if (!token || !csrfTokens.has(token)) {
        return false;
    }

    const expires = csrfTokens.get(token);
    if (expires < Date.now()) {
        csrfTokens.delete(token);
        return false;
    }

    return true;
};

/**
 * CSRF protection middleware
 */
export const csrfProtection = (req, res, next) => {
    // Skip CSRF for GET requests
    if (req.method === 'GET') {
        return next();
    }

    const token = req.headers['x-csrf-token'] || req.body._csrf;

    if (!verifyCSRFToken(token)) {
        return res.status(403).json({
            message: 'Invalid or missing CSRF token'
        });
    }

    next();
};