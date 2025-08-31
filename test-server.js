import express from 'express';
import systemRouter from './src/routes/system.js';
import streamsRouter from './src/routes/streams.js';

const app = express();
const PORT = 3002; // Using a completely new port to be safe

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Minimal test server with all routes is running!');
});

app.use('/api/system', systemRouter);
app.use('/api/streams', streamsRouter);

app.listen(PORT, () => {
  console.log(`[TEST-SERVER] Listening on http://localhost:${PORT} with all routes`);
});
