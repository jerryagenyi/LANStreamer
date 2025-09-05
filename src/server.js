import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';
import systemRouter from './routes/system.js';
import streamsRouter from './routes/streams.js';
import settingsRouter from './routes/settings.js';
import contactRouter from './routes/contact.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || 'localhost';

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
app.use('/api/system', systemRouter);
app.use('/api/streams', streamsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api', contactRouter);

// Serve dashboard page
app.get('/dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Serve client page (for listeners)
app.get('/client', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Fallback to index for SPA routing
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ error: 'API endpoint not found' });
  } else {
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
      console.log(`Local access: http://${localIPv4}:${PORT}/streams.html`);
    } else {
      console.log(`Local access: http://localhost:${PORT}/streams.html`);
    }
  }
  
  console.log('');
  console.log('⚠️  DO NOT CLOSE THIS TERMINAL TO KEEP LANStreamer SERVER RUNNING!');
  console.log('');
});

// console.log('[SERVER] Script finished. Exporting app.');
export default app; // Export the app for testing
