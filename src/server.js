import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import systemRouter from './routes/system.js';
import streamsRouter from './routes/streams.js';
import settingsRouter from './routes/settings.js';
import contactRouter from './routes/contact.js';
import authRouter from './routes/auth.js';
import { optionalAuth, authenticateToken } from './middleware/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Middleware
app.use(express.json());

// Serve static files from public directory
const publicPath = path.join(__dirname, '../public');
app.use(express.static(publicPath));

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

// Always start the server when this file is run
app.listen(PORT, HOST, () => {
  console.log(`Server is listening on http://${HOST}:${PORT}`);
  
  // Get local IPv4 address for network access
  const networkInterfaces = os.networkInterfaces();
  let localIPv4 = null;
  
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

// console.log('[SERVER] Script finished. Exporting app.');
export default app; // Export the app for testing
