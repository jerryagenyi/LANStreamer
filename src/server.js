import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import systemRouter from './routes/system.js';
import streamsRouter from './routes/streams.js';
import settingsRouter from './routes/settings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001; // Fixed port to avoid conflicts

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
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});

// console.log('[SERVER] Script finished. Exporting app.');
export default app; // Export the app for testing
