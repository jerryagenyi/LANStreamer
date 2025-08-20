# LANStreamer Vue.js Web Application

This directory contains the Vue.js web application that provides a browser-based admin interface for LANStreamer. It allows users to control audio streams, monitor system status, and configure settings through a modern web interface.

## Features

- **Stream Control**: Start/stop individual language streams
- **Real-time Monitoring**: Live status updates via WebSocket
- **Audio Device Management**: Detect and configure audio devices
- **System Health**: Monitor FFmpeg processes and Icecast server
- **User-friendly Interface**: Modern Vue.js UI with responsive design

## Quick Start

1. **Install Dependencies**:
   ```bash
   cd vue-app
   npm install
   ```

2. **Start Development Server**:
   ```bash
   npm run dev
   ```

3. **Access Web Interface**:
   - Open browser to `http://localhost:3000`
   - Default admin credentials: `admin` / `admin123`

## Project Structure

```
vue-app/
├── package.json          # Node.js dependencies and scripts
├── src/
│   ├── server.js         # Main Express server
│   ├── config/           # Configuration management
│   ├── routes/           # API endpoints
│   ├── services/         # Business logic services
│   ├── middleware/       # Express middleware
│   └── utils/            # Utility functions
├── frontend/             # Vue.js frontend application
├── tests/                # Test files
└── README.md            # This file
```

## Configuration

The application uses environment variables for configuration. Create a `.env` file in this directory:

```env
# Server Configuration
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Security
JWT_SECRET=your-secret-key
ADMIN_PASSWORD=your-admin-password

# Icecast Configuration
ICECAST_HOST=localhost
ICECAST_PORT=8000
ICECAST_SOURCE_PASSWORD=your-source-password
ICECAST_ADMIN_PASSWORD=your-admin-password

# Audio Configuration
DEFAULT_BITRATE=128k
DEFAULT_SAMPLE_RATE=44100
```

## API Endpoints

- `GET /api/system/status` - System health and status
- `GET /api/streams` - List all configured streams
- `POST /api/streams/start` - Start a stream
- `POST /api/streams/stop` - Stop a stream
- `GET /api/devices` - List available audio devices
- `WebSocket /` - Real-time updates

## Development

- **Start with auto-reload**: `npm run dev`
- **Run tests**: `npm test`
- **Lint code**: `npm run lint`
- **Build frontend**: `npm run build`

## Integration with LANStreamer

This web application works alongside the batch files and documentation in the parent directory:

- **Batch Files**: Located in `../` (start_dvs_streams.bat, stream.bat)
- **Documentation**: Audio pipeline concepts and setup guides
- **Configuration**: Can generate and update batch file variables

The web interface provides a modern alternative to manually editing batch files and running commands.

## Technology Stack

### Backend (Node.js + Express)
- **Express.js**: Web server framework
- **Socket.io**: Real-time WebSocket communication
- **Winston**: Logging and monitoring
- **Helmet**: Security middleware
- **JWT**: Authentication and authorization

### Frontend (Vue.js)
- **Vue.js 3**: Progressive JavaScript framework
- **Vue Router**: Client-side routing
- **Vuex/Pinia**: State management
- **Axios**: HTTP client for API calls
- **Bootstrap/Tailwind**: UI styling

### Services Integration
- **FFmpeg**: Audio processing and streaming
- **Icecast**: Streaming server management
- **System Monitoring**: Hardware and process monitoring
- **Audio Device Detection**: Cross-platform device enumeration

## Future Enhancements

- **Dynamic Stream Configuration**: No hardcoded languages
- **Audio Level Monitoring**: Real-time audio visualization
- **Stream Recording**: Save streams for later playback
- **Multi-user Support**: Role-based access control
- **External Integrations**: OBS Studio, streaming services
- **Mobile App**: React Native companion app
- **Analytics Dashboard**: Usage statistics and reporting

## Development Roadmap

### Phase 1: Core Functionality
- [x] Basic stream control interface
- [x] Real-time status monitoring
- [x] Audio device detection
- [ ] Stream configuration management

### Phase 2: Advanced Features
- [ ] Dynamic language configuration
- [ ] Audio level meters and visualization
- [ ] Stream recording and playback
- [ ] User management and authentication

### Phase 3: Enterprise Features
- [ ] Multi-tenant support
- [ ] Advanced analytics and reporting
- [ ] External API integrations
- [ ] Mobile application
- [ ] Cloud deployment options
