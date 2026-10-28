import os from 'os';
import readline from 'readline';
import app, { startServer } from './app.js';
import streamingService from './services/StreamingService.js';
import logger from './utils/logger.js';

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Start the server when this file is run (skip in test so supertest can use app)
if (process.env.NODE_ENV !== 'test') {
  const { server, shutdown } = startServer({ port: PORT, host: HOST });

  server.on('listening', () => {
    console.log(`Server is listening on http://${HOST}:${PORT}`);

    // Get local IPv4 address for network access (prioritize local network, exclude VPN)
    const networkInterfaces = os.networkInterfaces();
    let localIPv4 = null;

    const isLocalNetworkIP = (ip) => {
      return ip.startsWith('192.168.') ||
             ip.startsWith('10.') ||
             (ip.startsWith('172.') && parseInt(ip.split('.')[1]) >= 16 && parseInt(ip.split('.')[1]) <= 31);
    };

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

  // Interactive shutdown for the CLI (Electron uses the non-interactive shutdown from app.js)
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
            const stats = streamingService.getStats();
            const activeCount = stats.streams.filter(s => s.status === 'running').length;

            if (activeCount > 0) {
              console.log(`📡 Stopping ${activeCount} active stream(s)...`);
              await streamingService.stopAllStreams();
              console.log('✅ All streams stopped.');
            } else {
              console.log('✅ No active streams to stop.');
            }

            await new Promise((res) => {
              const forceTimer = setTimeout(() => res(), 5000);
              server.close(() => {
                clearTimeout(forceTimer);
                console.log('✅ Server closed.');
                res();
              });
            });

            console.log('\n👋 LANStreamer has been shut down gracefully.\n');
            resolve(true);
          } catch (error) {
            logger.error('Error during shutdown:', error);
            console.log('❌ Error during shutdown:', error.message);
            resolve(true);
          }
        }
      );
    });
  }

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
}

export default app; // Export the app for testing
