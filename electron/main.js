import { app, BrowserWindow, Tray, Menu, nativeImage, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SMOKE = process.argv.includes('--smoke') || process.env.ELECTRON_SMOKE === '1';
const BASE_PORT = parseInt(process.env.PORT || '3001', 10);

let mainWindow = null;
let tray = null;
let serverHandle = null;
let isQuitting = false;

// ---------------------------------------------------------------------------
// Server lifecycle (Express in-process; listeners on the LAN keep working)
// ---------------------------------------------------------------------------

const { startServer } = await import('../src/app.js');

function listenWithFallback(basePort, attempts = 5) {
  return new Promise((resolve, reject) => {
    const tryPort = (port, left) => {
      const handle = startServer({ port });
      handle.server.once('error', (err) => {
        if (err.code === 'EADDRINUSE' && left > 0) {
          tryPort(port + 1, left - 1);
        } else {
          reject(err);
        }
      });
      handle.server.once('listening', () => resolve(handle));
    };
    tryPort(basePort, attempts);
  });
}

/**
 * Kill a process and its whole tree. Windows child_process does NOT kill
 * descendants on parent exit, so orphaned FFmpeg/Icecast would keep the audio
 * device and ports locked after the app closes.
 */
function treeKill(pid) {
  if (!pid) return;
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ }
  }
}

async function shutdownBackend() {
  const streamingService = (await import('../src/services/StreamingService.js')).default;
  const icecastService = (await import('../src/services/IcecastService.js')).default;

  try {
    await streamingService.stopAllStreams();
  } catch (err) {
    console.error('[electron] stopAllStreams failed:', err.message);
  }

  // Belt-and-braces: tree-kill anything the services left behind
  for (const entry of Object.values(streamingService.activeStreams || {})) {
    const proc = entry?.process;
    if (proc?.pid && !proc.killed) treeKill(proc.pid);
  }
  if (icecastService.process?.pid && !icecastService.process.killed) {
    try { await icecastService.stop(false); } catch { /* ignore */ }
    if (!icecastService.process.killed) treeKill(icecastService.process.pid);
  }

  if (serverHandle) {
    await serverHandle.shutdown({ timeoutMs: 4000 });
    serverHandle = null;
  }
}

// ---------------------------------------------------------------------------
// Window + tray
// ---------------------------------------------------------------------------

function getIcon() {
  return nativeImage.createFromPath(path.join(__dirname, '..', 'public', 'assets', 'favicon.png'));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 600,
    icon: getIcon(),
    backgroundColor: '#0f0c29',
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.loadURL(`http://localhost:${serverHandle.port}/dashboard`);

  // Tray mode: closing the window must NOT stop streams for LAN listeners.
  // Real exit only happens through the tray's "Stop All & Quit".
  mainWindow.on('close', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on('closed', () => { mainWindow = null; });
}

function createTray() {
  tray = new Tray(getIcon());
  tray.setToolTip('LANStreamer');

  const menu = Menu.buildFromTemplate([
    { label: 'Show Dashboard', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    {
      label: 'Stop All & Quit',
      click: async () => {
        isQuitting = true;
        await shutdownBackend();
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(menu);
  tray.on('double-click', () => { if (mainWindow) mainWindow.show(); });
}

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  // Tray mode: closing all windows never quits the app
  app.on('window-all-closed', (e) => { /* keep running for LAN listeners */ });

  app.whenReady().then(async () => {
    try {
      serverHandle = await listenWithFallback(BASE_PORT);
    } catch (err) {
      dialog.showErrorBox('LANStreamer', `Could not start the local server: ${err.message}`);
      app.quit();
      return;
    }

    const os = require('node:os');
    const lanIp = Object.values(os.networkInterfaces())
      .flat()
      .find(i => i && i.family === 'IPv4' && !i.internal && /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(i.address));
    console.log(`[electron] server ready on port ${serverHandle.port}`);
    console.log(`[electron] listener page: http://${lanIp ? lanIp.address : 'localhost'}:${serverHandle.port}/streams`);

    createWindow();
    createTray();

    if (SMOKE) {
      mainWindow.webContents.once('did-finish-load', () => {
        console.log('SMOKE_OK');
        setTimeout(() => {
          isQuitting = true;
          shutdownBackend().finally(() => app.exit(0));
        }, 1500);
      });
    }
  });

  app.on('before-quit', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      isQuitting = true;
      shutdownBackend().finally(() => app.quit());
    }
  });
}
