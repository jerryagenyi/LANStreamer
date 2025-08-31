import express from 'express';

import systemRouter from './routes/system.js';

import streamsRouter from './routes/streams.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// A simple health check endpoint to confirm the server is running.
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// API Routes
app.use('/api/system', systemRouter);
app.use('/api/streams', streamsRouter);

// Only start listening if this file is run directly
// (i.e., not when required by a test file)
if (import.meta.url.startsWith('file://') && process.argv[1] === new URL(import.meta.url).pathname) {
  app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
  });
}

export default app; // Export the app for testing
