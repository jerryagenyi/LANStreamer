# LANStreamer Environment Configuration Example

This file contains all the environment variables needed for LANStreamer to function properly. Copy the content below to create your own `.env` file in the project root.

**Related Documentation:**
- [Technical Specification](LANStreamer-Technical-Specification.md) - System architecture and configuration requirements
- [Authentication & Security](Authentication-Security-Specification.md) - Security-related environment variables
- [Audio Monitoring Feature](Audio-Monitoring-Feature-Specification.md) - Monitoring configuration options

## Quick Setup

1. Copy this content to a new file named `.env` in your project root
2. Update all values marked with `CHANGE_THIS_VALUE`
3. Ensure FFmpeg and Icecast are installed
4. Run `npm install` and `npm start`

## Environment Variables

```bash
# ===================================
# LANStreamer Environment Configuration
# ===================================
# Copy this file to .env and modify values as needed for your environment
# All variables with CHANGE_THIS_VALUE must be updated for production use

# ===================================
# SERVER CONFIGURATION
# ===================================

# Node.js environment mode (development, production, test)
NODE_ENV=development

# Server port (default: 3001, avoid 3000 if running other services)
PORT=3001

# Server host binding (0.0.0.0 for all interfaces, 127.0.0.1 for localhost only)
HOST=0.0.0.0

# ===================================
# SECURITY & AUTHENTICATION
# ===================================

# JWT secret for token signing (CRITICAL: Change in production!)
# Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
JWT_SECRET=CHANGE_THIS_VALUE_lanstreamer-dev-secret-key-change-in-production

# JWT token expiration time (24h, 7d, 30d, etc.)
JWT_EXPIRES_IN=24h

# Admin panel password (CRITICAL: Change in production!)
ADMIN_PASSWORD=CHANGE_THIS_VALUE_admin123

# Session secret for express-session (CRITICAL: Change in production!)
SESSION_SECRET=CHANGE_THIS_VALUE_session-secret-change-this

# ===================================
# ICECAST STREAMING SERVER
# ===================================

# Icecast server hostname/IP
ICECAST_HOST=localhost

# Icecast server port (default: 8000)
ICECAST_PORT=8000

# Icecast admin password (CRITICAL: Change in production!)
ICECAST_ADMIN_PASSWORD=CHANGE_THIS_VALUE_hackme

# Icecast source password for stream connections (CRITICAL: Change in production!)
ICECAST_SOURCE_PASSWORD=CHANGE_THIS_VALUE_hackme

# Path to Icecast configuration file
ICECAST_CONFIG_PATH=./config/icecast.xml

# ===================================
# FFMPEG CONFIGURATION
# ===================================

# FFmpeg executable path (use 'ffmpeg' if in system PATH)
FFMPEG_PATH=ffmpeg

# FFmpeg logging level (quiet, panic, fatal, error, warning, info, verbose, debug)
FFMPEG_LOG_LEVEL=info

# Maximum number of concurrent streams allowed
MAX_CONCURRENT_STREAMS=16

# ===================================
# AUDIO STREAMING SETTINGS
# ===================================

# Default audio bitrate for new streams (64k, 128k, 192k, 256k, 320k)
DEFAULT_BITRATE=128k

# Default audio sample rate in Hz (22050, 44100, 48000)
DEFAULT_SAMPLE_RATE=44100

# Default number of audio channels (1=mono, 2=stereo)
DEFAULT_CHANNELS=2

# Audio buffer size in samples (larger = more latency but more stable)
AUDIO_BUFFER_SIZE=1024

# ===================================
# NETWORK CONFIGURATION
# ===================================

# Base URL for stream access (used in generated stream URLs)
STREAM_BASE_URL=http://localhost:8000

# Client listening port (for web interface)
CLIENT_PORT=8080

# WebSocket port for real-time updates (usually same as server port)
WEBSOCKET_PORT=3001

# ===================================
# LOGGING CONFIGURATION
# ===================================

# Log level (error, warn, info, verbose, debug, silly)
LOG_LEVEL=info

# Directory for log files
LOG_FILE_PATH=./logs

# Maximum size per log file before rotation
LOG_MAX_SIZE=10m

# Maximum number of log files to keep
LOG_MAX_FILES=5

# ===================================
# DEVELOPMENT SETTINGS
# ===================================

# Enable CORS for cross-origin requests (true for development)
ENABLE_CORS=true

# Enable API rate limiting (true recommended for production)
ENABLE_RATE_LIMITING=true

# Rate limit window in milliseconds (15 minutes = 900000)
RATE_LIMIT_WINDOW_MS=900000

# Maximum requests per window per IP
RATE_LIMIT_MAX_REQUESTS=100

# ===================================
# HARDWARE SIMULATION
# ===================================

# Simulate hardware for testing without real audio devices (true/false)
SIMULATE_HARDWARE=true

# Virtual audio device name for testing (Windows: VB-Cable, Linux: PulseAudio, macOS: Soundflower)
VIRTUAL_AUDIO_DEVICE=VB-Cable

# ===================================
# EXTERNAL INTEGRATIONS
# ===================================

# Path to OBS Studio executable (optional, for future OBS integration)
OBS_STUDIO_PATH=

# Enable OBS Studio integration features (true/false)
ENABLE_OBS_INTEGRATION=true

# ===================================
# DATA STORAGE
# ===================================

# Path to application configuration database (JSON file)
CONFIG_DB_PATH=./data/config.json

# Path to streams database (JSON file)
STREAMS_DB_PATH=./data/streams.json

# ===================================
# MONITORING & HEALTH CHECKS
# ===================================

# Enable periodic health checks (true/false)
ENABLE_HEALTH_CHECKS=true

# Health check interval in milliseconds (30 seconds = 30000)
HEALTH_CHECK_INTERVAL=30000

# Enable metrics collection and reporting (true/false)
METRICS_ENABLED=true

# ===================================
# SECURITY HEADERS & MIDDLEWARE
# ===================================

# Enable Helmet.js security headers (true recommended for production)
ENABLE_HELMET=true

# Enable gzip compression (true recommended for production)
ENABLE_COMPRESSION=true

# ===================================
# FILE HANDLING
# ===================================

# Maximum file upload size (for future file upload features)
MAX_FILE_SIZE=10mb

# Directory for file uploads
UPLOAD_PATH=./uploads

# ===================================
# BACKUP & RECOVERY
# ===================================

# Enable automatic backups (true/false)
BACKUP_ENABLED=true

# Backup interval in milliseconds (1 hour = 3600000)
BACKUP_INTERVAL=3600000

# Directory for backup files
BACKUP_PATH=./backups

# ===================================
# ADVANCED CONFIGURATION
# ===================================

# Enable debug mode for verbose logging (true/false)
DEBUG_MODE=false

# Timezone for timestamps (UTC, America/New_York, Europe/London, etc.)
TZ=UTC

# Process title (appears in process lists)
PROCESS_TITLE=LANStreamer

# ===================================
# DATABASE CONFIGURATION (Future Use)
# ===================================

# Database type (sqlite, mysql, postgresql) - Currently using JSON files
# DATABASE_TYPE=sqlite

# Database connection string - Currently not used
# DATABASE_URL=sqlite://./data/lanstreamer.db

# ===================================
# REDIS CONFIGURATION (Future Use)
# ===================================

# Redis URL for caching and session storage - Currently not used
# REDIS_URL=redis://localhost:6379

# ===================================
# CLOUD STORAGE (Future Use)
# ===================================

# AWS S3 bucket for file storage - Currently not used
# AWS_S3_BUCKET=
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_REGION=us-east-1
```

## Production Security Notes

⚠️ **CRITICAL**: Change all values marked with `CHANGE_THIS_VALUE` before production use!

### Required Changes for Production

1. **JWT_SECRET**: Generate a secure secret with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```

2. **ADMIN_PASSWORD**: Use a strong password (12+ characters, mixed case, numbers, symbols)

3. **SESSION_SECRET**: Generate another unique secret

4. **ICECAST_ADMIN_PASSWORD**: Strong password for Icecast admin access

5. **ICECAST_SOURCE_PASSWORD**: Strong password for stream sources

6. **NODE_ENV**: Set to `production`

### Quick Start Checklist

- [ ] Copy environment variables to `.env` file
- [ ] Update all `CHANGE_THIS_VALUE` entries
- [ ] Install FFmpeg and ensure it's in system PATH
- [ ] Install Icecast server
- [ ] Test audio device detection
- [ ] Configure firewall for ports 3001 and 8000
- [ ] Run `npm install`
- [ ] Run `npm start`
- [ ] Access dashboard at `http://localhost:3001/dashboard`

### Port Configuration

| Service | Default Port | Purpose |
|---------|-------------|---------|
| LANStreamer Server | 3001 | Web dashboard and API |
| Icecast Server | 8000 | Audio streaming |
| Client Interface | 8080 | Future client-specific interface |

### Dependencies Required

- **Node.js** (v16+)
- **FFmpeg** (for audio processing)
- **Icecast** (for streaming server)
- **Audio devices** (or virtual audio cable for testing)

### Platform-Specific Notes

#### Windows
- Use VB-Cable for virtual audio testing
- Ensure FFmpeg is in PATH or specify full path in `FFMPEG_PATH`

#### Linux
- Use PulseAudio for virtual audio testing
- Install FFmpeg via package manager: `sudo apt install ffmpeg`

#### macOS
- Use Soundflower for virtual audio testing
- Install FFmpeg via Homebrew: `brew install ffmpeg`

## Troubleshooting

### Common Issues

1. **Port already in use**: Change `PORT` value if 3001 is occupied
2. **FFmpeg not found**: Install FFmpeg and ensure it's in PATH
3. **Audio devices not detected**: Check permissions and virtual audio drivers
4. **Icecast connection failed**: Verify Icecast is installed and running

### Log Files

Logs are stored in the directory specified by `LOG_FILE_PATH` (default: `./logs`). Check these files for detailed error information:

- `combined.log` - All log levels
- `error.log` - Error messages only
- `app-%DATE%.log` - Daily rotating logs
