# Authentication & Security Specification

## Overview

LANStreamer requires robust authentication and security measures to protect against unauthorised access while maintaining ease of use for legitimate administrators. This specification covers login systems, default credential management, and security best practices.

**Related Documentation:**
- [Technical Specification](LANStreamer-Technical-Specification.md) - JWT implementation and browser permission APIs
- [UI Design Specification](Admin-Dashboard-UI-Design.md) - Visual design for login pages and security warnings
- [Environment Configuration](env-example.md) - Security environment variables and deployment settings
- [Product Requirements](LANStreamer-PRD.md) - Security scope and requirements for v1.0

## Authentication Requirements

### Default Credentials Strategy

#### Initial Setup
- **Default Username**: `admin`
- **Default Password**: `admin`
- **Purpose**: Enable immediate access for initial setup
- **Security Warning**: Persistent warning until credentials are changed

#### Security Implementation Requirements
- **Default credential detection**: System must identify when default admin/admin credentials are in use
- **Warning persistence**: Security warnings must remain visible until credentials are changed
- **Session tracking**: Authentication system must track whether default credentials are being used

### Login Page Design

#### Visual Elements
- **Clean, minimal design** consistent with dashboard theme
- **LANStreamer logo** prominently displayed
- **Dark theme** matching admin dashboard
- **Responsive layout** for desktop and mobile

#### Form Elements
```html
<form id="loginForm">
  <input type="text" id="username" placeholder="Username" value="admin" />
  <input type="password" id="password" placeholder="Password" value="admin" />
  <label>
    <input type="checkbox" id="rememberMe" />
    Remember Me
  </label>
  <button type="submit">Login</button>
  <a href="#change-credentials">Change Default Credentials</a>
</form>
```

#### Security Features
- **HTTPS enforcement** in production
- **Rate limiting** to prevent brute force attacks
- **Session timeout** for idle connections
- **CSRF protection** for form submissions

## Security Warning System

### Default Credential Banner

#### Display Conditions
- **Trigger**: User logged in with default `admin/admin` credentials
- **Persistence**: Warning remains until credentials are changed
- **Visibility**: Prominent red banner below header status indicators

#### Banner Design
```html
<div class="security-warning-banner">
  <span class="warning-icon">⚠️</span>
  <span class="warning-text">
    You are using default credentials (admin/admin). 
    <strong>Change your password immediately</strong> for security.
  </span>
  <button class="change-password-btn">Change Password</button>
  <button class="dismiss-btn">×</button>
</div>
```

#### Styling Specifications
```css
.security-warning-banner {
  background: #ff0000;
  color: #ffffff;
  padding: 12px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #cc0000;
}

.warning-text {
  flex: 1;
  font-weight: 500;
  margin-left: 12px;
}

.change-password-btn {
  background: #ffffff;
  color: #ff0000;
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  font-weight: bold;
  cursor: pointer;
}
```

### Browser Permission Integration

#### Device Access Security
- **Microphone permissions** required for device detection
- **Camera permissions** for future video features
- **Clear permission states** communicated to user
- **Graceful degradation** when permissions denied

#### Permission Request Requirements
- **Browser API Integration**: Must use standard `getUserMedia()` for device access requests
- **Permission State Management**: Track and respond to granted/denied/prompt states
- **User Experience**: Provide clear feedback for each permission state
- **Error Handling**: Graceful degradation when permissions are denied
- **Retry Mechanism**: Allow users to retry permission requests

## Password Management

### Password Change Workflow

#### Change Password Form
```html
<form id="changePasswordForm">
  <input type="password" id="currentPassword" placeholder="Current Password" required />
  <input type="password" id="newPassword" placeholder="New Password" required />
  <input type="password" id="confirmPassword" placeholder="Confirm New Password" required />
  <button type="submit">Update Password</button>
</form>
```

#### Password Requirements
- **Minimum length**: 8 characters
- **Character requirements**: Mix of letters, numbers, and symbols
- **Validation**: Real-time feedback during input
- **Confirmation**: Must match confirmation field

#### Security Validation
```javascript
function validatePassword(password) {
  const requirements = {
    minLength: password.length >= 8,
    hasLetter: /[a-zA-Z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSymbol: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    notDefault: password !== 'admin'
  };
  
  return {
    isValid: Object.values(requirements).every(req => req),
    requirements
  };
}
```

## Session Management

### JWT Token Implementation

#### Token Structure
```json
{
  "userId": "admin",
  "role": "administrator", 
  "iat": 1640995200,
  "exp": 1641081600,
  "isDefaultCredentials": true
}
```

#### Security Configuration
```javascript
const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'change-this-secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  algorithm: 'HS256'
};
```

### Session Security Features

#### Automatic Logout
- **Idle timeout**: 30 minutes of inactivity
- **Warning notification**: 5 minutes before timeout
- **Session extension**: Option to extend active session

#### Security Headers
```javascript
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000');
  next();
});
```

## API Security

### Authentication Middleware

#### Protected Routes
```javascript
const authenticatedRoutes = [
  '/api/streams/*',
  '/api/system/*',
  '/api/admin/*'
];

app.use(authenticatedRoutes, authenticateToken);
```

#### Rate Limiting
```javascript
const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/auth/login', authLimiter);
```

## Environment Variables

### Security Configuration
```env
# Authentication
JWT_SECRET=your-super-secure-secret-key-change-this
JWT_EXPIRES_IN=24h
SESSION_TIMEOUT_MINUTES=30

# Default Credentials (for development only)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin
FORCE_PASSWORD_CHANGE=true

# Security Features
ENABLE_RATE_LIMITING=true
REQUIRE_HTTPS=true
ENABLE_SECURITY_HEADERS=true

# CORS Configuration
CORS_ORIGIN=http://localhost:3001
CORS_CREDENTIALS=true
```

## Implementation Priority

### Phase 1: Basic Authentication ⏳
1. Login page with default credentials
2. JWT token generation and validation
3. Protected route middleware
4. Basic session management

### Phase 2: Security Enhancements ⏳
1. Default credential warning banner
2. Password change functionality  
3. Rate limiting implementation
4. Security headers configuration

### Phase 3: Advanced Security ⏳
1. Session timeout and warnings
2. Audit logging for authentication events
3. Two-factor authentication (future)
4. OAuth integration options (future)

## Security Best Practices

### Production Deployment
- **Change default credentials** immediately
- **Use HTTPS** for all communications
- **Regular security updates** for dependencies
- **Monitor authentication logs** for suspicious activity

### Development Guidelines
- **Never commit credentials** to version control
- **Use environment variables** for all secrets
- **Test authentication flows** thoroughly
- **Document security configurations** clearly

This specification ensures LANStreamer maintains security while providing a smooth user experience for legitimate administrators managing live audio streaming events.
