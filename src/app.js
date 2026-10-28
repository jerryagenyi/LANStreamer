import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import systemRouter from './routes/system.js';
import streamsRouter from './routes/streams.js';
import settingsRouter from './routes/settings.js';
import contactRouter from './routes/contact.js';
import authRouter from './routes/auth.js';
import { optionalAuth } from './middleware/auth.js';
import { requireLocalhostAdmin } from './middleware/requireLocalhost.js';
import streamingService from './services/StreamingService.js';
import icecastService from './services/IcecastService.js';
import logger from './utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp() {
  const app = express();

  app.use(express.json());

  // Serve static files from public directory (so listener page on LAN gets CSS/JS)
  const publicPath = path.join(__dirname, '../public');
  app.use(express.static(publicPath));

  // Lock admin to localhost: block admin UI and admin APIs from non-localhost (listener page and APIs stay allowed)
  app.use(requireLocalhostAdmin);

  app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'OK', message: 'Server is running' });
  });

  // API Routes
  app.use('/api/auth', authRouter);
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
      res.sendFile(path.join(__dirname, '../public/streams.html'));
    } else if (req.path === '/login.html') {
      res.sendFile(path.join(__dirname, '../public/login.html'));
    } else {
      // Direct access to admin dashboard
      res.sendFile(path.join(__dirname, '../public/index.html'));
    }
  });

  return app;
}

const app = createApp();

/**
 * Start the HTTP server without CLI prompts (used by Electron and other embedders).
 * Returns { server, port, host, shutdown } where shutdown stops streams, stops
 * Icecast if it is running, and closes the HTTP server. Never prompts stdin.
 */
export function startServer({ port = process.env.PORT || 3001, host = process.env.HOST || '0.0.0.0' } = {}) {
  const server = app.listen(port, host);

  const shutdown = async ({ timeoutMs = 5000 } = {}) => {
    try {
      const stats = streamingService.getStats();
      const running = stats.streams.filter(s => s.status === 'running');
      if (running.length > 0) {
        logger.info(`Shutdown: stopping ${running.length} active stream(s)...`);
        await streamingService.stopAllStreams();
      }
      if (icecastService.process && !icecastService.process.killed) {
        logger.info('Shutdown: stopping Icecast...');
        await icecastService.stop(false).catch(err => logger.warn(`Icecast stop failed: ${err.message}`));
      }
    } catch (error) {
      logger.error('Error stopping services during shutdown:', error);
    }

    await new Promise((resolve) => {
      const forceTimer = setTimeout(() => resolve(), timeoutMs);
      server.close(() => {
        clearTimeout(forceTimer);
        resolve();
      });
    });
  };

  return { server, port, host, shutdown };
}

export default app;
