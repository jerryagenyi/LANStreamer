import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import readline from 'readline';
import systemRouter from './routes/system.js';
import streamsRouter from './routes/streams.js';
import settingsRouter from './routes/settings.js';
import contactRouter from './routes/contact.js';
import authRouter from './routes/auth.js';
import { optionalAuth, authenticateToken } from './middleware/auth.js';
import { requireLocalhostAdmin } from './middleware/requireLocalhost.js';
import streamingService from './services/StreamingService.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(express.json());

// Serve static files from public directory (so listener page on LAN gets CSS/JS)
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

// Lock admin to localhost: block admin UI and admin APIs from non-localhost (listener page and APIs stay allowed)
app.use(requireLocalhostAdmin);

// A simple health check endpoint to confirm the server is running.
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// console.log('[SERVER] Health check route configured.');

// API Routes
app.use('/api/auth', authRouter);
// app.use('/api/system', authenticateToken, systemRouter);
// app.use('/api/streams', authenticateToken, streamsRouter);
// app.use('/api/settings', authenticateToken, settingsRouter);
app.use('/api/system', systemRouter);
app.use('/api/streams', streamsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api', contactRouter); // Contact routes can be public

// Serve login page
app.get('/login', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/login.html'));
});

// Serve dashboard page (protected)
app.get('/dashboard', optionalAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve client page (for listeners)
app.get('/client', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve streams page (for listeners) - both /streams and /streams.html
app.get('/streams', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/streams.html'));
});

app.get('/streams.html', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/streams.html'));
});

// Fallback to index for SPA routing (but exclude /streams routes)
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else if (req.path === '/streams' || req.path === '/streams.html') {
    // This should not happen due to the specific routes above, but just in case
    res.sendFile(path.join(__dirname, '../public/streams.html'));
  } else if (req.path === '/login.html') {
    res.sendFile(path.join(__dirname, '../public/login.html'));
  } else {
    // Direct access to admin dashboard (no auth required)
    res.sendFile(path.join(__dirname, '../public/index.html'));
  }
});

// Global server reference for graceful shutdown
let server = null;

// Graceful shutdown handler
async function gracefulShutdown(signal = 'SIGINT') {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(
      '\n⚠️  Shutdown requested. Stop LANStreamer server? [Y/n] (default: Y) ',
      async (answer) => {
        rl.close();

        const shouldShutdown = !answer || answer.toLowerCase() === 'y' || answer === '';

        if (!shouldShutdown) {
          console.log('❌ Shutdown cancelled. Server continues running.\n');
          resolve(false);
          return;
        }

        console.log('\n🛑 Shutting down LANStreamer server...');

        try {
          // Stop all active streams
          const stats = streamingService.getStats();
          const activeCount = stats.streams.filter(s => s.status === 'running').length;

          if (activeCount > 0) {
            console.log(`📡 Stopping ${activeCount} active stream(s)...`);
            await streamingService.stopAllStreams();
            console.log('✅ All streams stopped.');
          } else {
            console.log('✅ No active streams to stop.');
          }

          // Close the server
          if (server) {
            server.close(() => {
              console.log('✅ Server closed.');
              console.log('\n👋 LANStreamer has been shut down gracefully.\n');
              resolve(true);
            });

            // Force shutdown after 5 seconds if server doesn't close
            setTimeout(() => {
              console.log('\n⚠️  Forced shutdown after timeout.');
              resolve(true);
              process.exit(0);
            }, 5000);
          } else {
            console.log('✅ Shutdown complete.');
            resolve(true);
          }
        } catch (error) {
          logger.error('Error during shutdown:', error);
          console.log('❌ Error during shutdown:', error.message);
          resolve(true);
        }
      }
    );
  });
}

// Handle shutdown signals
process.on('SIGINT', async () => {
  const shouldExit = await gracefulShutdown('SIGINT');
  if (shouldExit) {
    process.exit(0);
  }
});

process.on('SIGTERM', async () => {
  const shouldExit = await gracefulShutdown('SIGTERM');
  if (shouldExit) {
    process.exit(0);
  }
});

// Start the server when this file is run (skip in test so supertest can use app)
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, HOST, () => {
  console.log(`Server is listening on http://${HOST}:${PORT}`);
  
  // Get local IPv4 address for network access (prioritize local network, exclude VPN)
  const networkInterfaces = os.networkInterfaces();
  let localIPv4 = null;

  // Function to check if IP is a local network address
  const isLocalNetworkIP = (ip) => {
    return ip.startsWith('192.168.') ||
           ip.startsWith('10.') ||
           (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31);
  };

  // First pass: Look for local network IPs (192.168.x.x, 10.x.x.x, 172.16-31.x.x)
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    if (interfaces) {
      for (const iface of interfaces) {
        if (iface.family === 'IPv4' && !iface.internal && isLocalNetworkIP(iface.address)) {
          localIPv4 = iface.address;
          break;
        }
      }
    }
    if (localIPv4) break;
  }

  // Second pass: If no local network IP found, get any non-internal IPv4
  if (!localIPv4) {
    for (const interfaceName in networkInterfaces) {
      const interfaces = networkInterfaces[interfaceName];
      if (interfaces) {
        for (const iface of interfaces) {
          if (iface.family === 'IPv4' && !iface.internal) {
            localIPv4 = iface.address;
            break;
          }
        }
      }
      if (localIPv4) break;
    }
  }
  
  if (HOST === '0.0.0.0') {
    console.log(`Network access: Server is accessible from other devices on your network`);
    if (localIPv4) {
      console.log(`Admin Dashboard: http://${localIPv4}:${PORT}`);
      console.log(`Listener Page: http://${localIPv4}:${PORT}/streams`);
    } else {
      console.log(`Admin Dashboard: http://localhost:${PORT}`);
      console.log(`Listener Page: http://localhost:${PORT}/streams`);
    }
  }
  
  console.log('');
  console.log('⚠️  DO NOT CLOSE THIS TERMINAL TO KEEP LANStreamer SERVER RUNNING!');
  console.log('');
  });
}

// console.log('[SERVER] Script finished. Exporting app.');
export default app; // Export the app for testing
