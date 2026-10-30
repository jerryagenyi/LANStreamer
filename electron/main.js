import { app, BrowserWindow, Tray, Menu, nativeImage, dialog, shell, powerSaveBlocker, powerMonitor } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SMOKE = process.argv.includes('--smoke') || process.env.ELECTRON_SMOKE === '1';
const BASE_PORT = parseInt(process.env.PORT || '3001', 10);

// Bundled binaries + writable data dir for PACKAGED installs — must be set
// before the server code below imports, so services resolve the vendored
// FFmpeg/Icecast (resources/vendor) and keep config/logs in userData.
if (app.isPackaged && !process.env.LANSTREAMER_VENDOR_DIR) {
  process.env.LANSTREAMER_VENDOR_DIR = path.join(process.resourcesPath, 'vendor');
  process.env.LANSTREAMER_DATA_DIR = app.getPath('userData');
}

let mainWindow = null;
let tray = null;
let serverHandle = null;
let isQuitting = false;

// ---------------------------------------------------------------------------
// Server lifecycle (Express in-process; listeners on the LAN keep working)
// ---------------------------------------------------------------------------

// Mint per-install admin credentials BEFORE the server code loads its config:
// packaged installs must never run on the repo's public defaults. The
// plaintext exists only in this variable, shown once after the window opens.
let freshCreds = null;
try {
  const store = await import('../src/utils/securityStore.js');
  freshCreds = store.mintFirstRunSecurity();
} catch (err) {
  console.error('[electron] first-run credential minting failed:', err.message);
}

const { startServer } = await import('../src/app.js');

function listenWithFallback(basePort, attempts = 5) {
  return new Promise((resolve, reject) => {
    const tryPort = (port, left) => {
      const handle = startServer({ port });
      handle.server.once('error', (err) => {
        try { handle.server.close(); } catch { /* not listening anyway */ }
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
    spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
  } else {
    try { process.kill(pid, 'SIGTERM'); } catch { /* already gone */ }
  }
}

/**
 * Startup sweep after a crash / End-Task (Windows never reaps children of a
 * dead parent): stale ffmpeg/icecast keep the audio device and ports locked.
 * Matched by EXECUTABLE PATH under a LANStreamer vendor dir — never by
 * process name, so the user's own FFmpeg/VoiceMeeter processes are untouchable.
 */
function sweepOrphanChildren() {
  if (process.platform !== 'win32') return 0;
  try {
    const out = execSync(
      `powershell -NoProfile -Command "Get-CimInstance Win32_Process -Filter "name='ffmpeg.exe' or name='icecast.exe'" | ` +
      `Where-Object { $_.ExecutablePath -like '*LANStreamer*vendor*' } | ` +
      `ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue; $_.ProcessId }"`,
      { encoding: 'utf8', windowsHide: true, timeout: 15000 }
    ).trim();
    const pids = out.split(/\s+/).filter(Boolean);
    if (pids.length) console.log(`[electron] startup sweep killed ${pids.length} orphaned vendor process(es): ${pids.join(', ')}`);
    return pids.length;
  } catch {
    return 0; // sweep is best-effort — never block startup on it
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
  // (activeStreams entries carry ffmpegProcess — entry.process was a typo
  // that made this safety net a no-op)
  for (const entry of Object.values(streamingService.activeStreams || {})) {
    const proc = entry?.ffmpegProcess;
    if (proc?.pid && proc.exitCode === null) treeKill(proc.pid);
  }
  if (icecastService.process?.pid && !icecastService.process.killed) {
    try { await icecastService.stop(false); } catch { /* ignore */ }
    if (!icecastService.process.killed) treeKill(icecastService.process.pid);
  }

  if (serverHandle) {
    // Streams + icecast were already stopped above (ordered, with belt-and-
    // braces tree-kills) — skip the duplicate pass inside shutdown.
    await serverHandle.shutdown({ timeoutMs: 4000, stopStreams: false });
    serverHandle = null;
  }

  const telemetry = (await import('../src/services/TelemetryService.js')).default;
  await telemetry.shutdown();
}

// ---------------------------------------------------------------------------
// Window + tray
// ---------------------------------------------------------------------------

function getIcon() {
  const img = nativeImage.createFromPath(path.join(__dirname, '..', 'public', 'assets', 'favicon.png'));
  if (img.isEmpty()) console.warn('[electron] icon image is empty/missing — tray may be invisible');
  return img;
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

  // A dead renderer with hide-on-close + tray-only quit = white window with no
  // recovery. Reload instead.
  mainWindow.webContents.on('render-process-gone', (_e, details) => {
    if (details.reason !== 'clean-exit') {
      console.error('[electron] renderer gone:', details.reason, '— reloading');
      mainWindow.reload();
    }
  });

  // Links like "Listen to Streams" (and any external URL) open in the user's
  // system browser, not a child Electron window. The listener page is meant
  // for phones/other machines anyway.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    // Keep in-app navigation confined to our own dashboard
    if (!url.startsWith(`http://localhost:`)) {
      e.preventDefault();
      shell.openExternal(url);
    }
  });

  mainWindow.loadURL(`http://localhost:${serverHandle.port}/dashboard`);

  // Alt-accessible menu with a real Exit — insurance for the worst case of an
  // invisible tray icon + hide-on-close, which would otherwise be unexitable.
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'File', submenu: [{ label: 'Exit', click: () => { isQuitting = true; shutdownBackend().finally(() => app.quit()); } }] },
    { role: 'editMenu' },
    { role: 'viewMenu' },
  ]));

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

async function createTray() {
  const telemetry = (await import('../src/services/TelemetryService.js')).default;
  const telemetryItem = {
    label: `Telemetry: ${telemetry.getConsentState().enabled ? 'On' : 'Off'}`,
    click: async () => {
      const state = telemetry.getConsentState();
      telemetry.setConsented(!state.enabled);
      createTray().catch(err => console.error('[electron] tray refresh failed:', err.message));
    },
  };

  // Tray is a native handle — destroy the old one before reassigning, or every
  // telemetry toggle leaks it (and stacks ghost icons on some Windows builds).
  if (tray) { try { tray.destroy(); } catch { /* already gone */ } tray = null; }
  tray = new Tray(getIcon());
  tray.setToolTip('LANStreamer');

  const menu = Menu.buildFromTemplate([
    { label: 'Show Dashboard', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.focus(); } } },
    { type: 'separator' },
    { label: 'Telemetry', submenu: [telemetryItem] },
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

/**
 * First-run consent: ask once, remember the answer (config/telemetry.json).
 * Users can change it anytime from the tray menu (Telemetry: On/Off).
 */
async function maybeAskTelemetryConsent() {
  const telemetry = (await import('../src/services/TelemetryService.js')).default;
  const state = telemetry.getConsentState();
  if (state.consented !== null || !telemetry.getKey()) return; // decided, or nothing to enable

  const { response } = await dialog.showMessageBox(mainWindow, {
    type: 'question',
    title: 'Help improve LANStreamer?',
    message: 'Allow anonymous usage statistics?',
    detail: 'LANStreamer is free and open source — no one profits from it.\n\n'
      + 'If you allow telemetry, the operator of this install sends anonymous events '
      + '(app start/stop, stream started/stopped/failed, app version, OS) to the '
      + 'maintainer\'s PostHog. No audio, no stream names, no personal data, and '
      + 'listeners\' phones never send anything.\n\n'
      + 'You can change this anytime: tray icon → Telemetry → On/Off.',
    buttons: ['Allow', 'Decline'],
    defaultId: 1,
    cancelId: 1,
    noLink: true,
  });

  telemetry.setConsented(response === 0);
  createTray(); // refresh the tray label
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
    // Packaged data dir must exist before server code writes config/logs into it
    if (app.isPackaged) {
      try { require('node:fs').mkdirSync(process.env.LANSTREAMER_DATA_DIR, { recursive: true }); } catch { /* best effort */ }
    }

    // Free audio devices/ports held by children of a previous crashed session
    sweepOrphanChildren();

    try {
      serverHandle = await listenWithFallback(BASE_PORT);
    } catch (err) {
      dialog.showErrorBox('LANStreamer', `Could not start the local server: ${err.message}`);
      app.quit();
      return;
    }

    // Port fallback = a leftover LANStreamer/server almost certainly owns the
    // base port. Two instances sharing one config cause stream conflicts —
    // surface it instead of silently running on 3002+.
    if (serverHandle.port !== BASE_PORT && !SMOKE) {
      dialog.showMessageBox(null, {
        type: 'warning',
        title: 'LANStreamer',
        message: `LANStreamer started on port ${serverHandle.port} (port ${BASE_PORT} was already in use).`,
        detail: 'Another LANStreamer server — probably a leftover instance — is likely still running. Two servers sharing one configuration cause stream conflicts and "device busy" errors.\n\nStop the other instance (close its terminal window, or quit the other app from its tray), then relaunch. See the in-app guide (/docs) → "port already in use".',
        buttons: ['Continue anyway', 'Quit now'],
        defaultId: 1,
        noLink: true,
      }).then(({ response }) => {
        if (response === 1) { isQuitting = true; shutdownBackend().finally(() => app.quit()); }
      }).catch(() => { /* dialog never blocks boot */ });
    }

    const os = require('node:os');
    const lanIp = Object.values(os.networkInterfaces())
      .flat()
      .find(i => i && i.family === 'IPv4' && !i.internal && /^(192\.168|10\.|172\.(1[6-9]|2\d|3[01]))/.test(i.address));
    console.log(`[electron] server ready on port ${serverHandle.port}`);
    console.log(`[electron] listener page: http://${lanIp ? lanIp.address : 'localhost'}:${serverHandle.port}/streams`);

    createWindow();
    createTray().catch(err => console.error('[electron] tray creation failed:', err.message));
    maybeAskTelemetryConsent().catch(err => console.error('[electron] telemetry prompt failed:', err.message));

    // Show-once: the per-install admin password minted at first run
    if (freshCreds && !SMOKE) {
      const { username, password } = freshCreds;
      freshCreds = null; // plaintext leaves memory right after the dialog
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'LANStreamer — your admin login',
        message: `Username:  ${username}\nPassword:  ${password}`,
        detail: 'Write these down now — this is the only time the password is shown. '
          + 'You can change it anytime from the dashboard (Admin account settings).',
        buttons: ['I saved it'],
        noLink: true,
      }).then(async () => {
        const store = await import('../src/utils/securityStore.js');
        store.clearFreshFlag();
      }).catch(() => { /* flag stays; dialog re-shows next launch */ });
    }

    startPowerManagement();

    if (SMOKE) {
      mainWindow.webContents.once('did-finish-load', () => {
        console.log('SMOKE_OK');
        setTimeout(() => {
          isQuitting = true;
          shutdownBackend().finally(() => app.exit(0));
        }, 1500);
      });
    }
  }).catch(err => {
    dialog.showErrorBox('LANStreamer', `Startup failed: ${err && err.message}`);
    app.quit();
  });

  app.on('before-quit', (e) => {
    if (!isQuitting) {
      e.preventDefault();
      isQuitting = true;
      shutdownBackend().finally(() => app.quit());
    }
  });

  // One policy for the unexpected in a packaged app (no console to see it in):
  // surface it, then take the ordered shutdown path instead of orphaning children.
  process.on('uncaughtException', (err) => {
    console.error('[electron] uncaught exception:', err);
    try {
      dialog.showErrorBox('LANStreamer', `An unexpected error occurred:\n\n${err && err.message}\n\nThe app will now shut down.`);
    } catch { /* dialogs can fail headless */ }
    isQuitting = true;
    shutdownBackend().finally(() => app.exit(1));
  });
}

/**
 * Power edge cases: Windows suspending mid-broadcast kills the stream silently
 * (the event-killer), and after resume, FFmpeg has usually died on the device.
 * - While ANY stream is live: block system suspension (audio keeps flowing
 *   with the display off — 'prevent-app-suspension', not screen-wake).
 * - On resume: bring back streams that were live before suspend.
 */
async function startPowerManagement() {
  // Module is already loaded (server boots it) — this import resolves instantly
  const streamingService = (await import('../src/services/StreamingService.js')).default;
  let blockerId = null;
  let liveBeforeSuspend = [];

  setInterval(() => {
    try {
      const running = (streamingService.getStats().streams || []).filter(s => s.status === 'running').length;
      if (running > 0 && blockerId === null) {
        blockerId = powerSaveBlocker.start('prevent-app-suspension');
        console.log(`[electron] powerSaveBlocker on (${running} live stream${running > 1 ? 's' : ''})`);
      } else if (running === 0 && blockerId !== null) {
        powerSaveBlocker.stop(blockerId);
        blockerId = null;
        console.log('[electron] powerSaveBlocker off (no live streams)');
      }
    } catch { /* stats unavailable during teardown */ }
  }, 5000).unref?.();

  powerMonitor.on('suspend', () => {
    try {
      liveBeforeSuspend = (streamingService.getStats().streams || []).filter(s => s.status === 'running').map(s => s.id);
      if (liveBeforeSuspend.length) console.log(`[electron] suspend with ${liveBeforeSuspend.length} live stream(s) — will restore on resume`);
    } catch { liveBeforeSuspend = []; }
  });

  powerMonitor.on('resume', async () => {
    if (!liveBeforeSuspend.length) return;
    const ids = liveBeforeSuspend;
    liveBeforeSuspend = [];
    console.log('[electron] resume — restoring streams in 5s:', ids.join(', '));
    await new Promise(r => setTimeout(r, 5000)); // let devices/network settle
    for (const id of ids) {
      try {
        const current = (streamingService.getStats().streams || []).find(s => s.id === id);
        if (current && current.status !== 'running') {
          await streamingService.restartStream(id);
          console.log(`[electron] restored stream ${id} after resume`);
        }
      } catch (err) {
        console.error(`[electron] could not restore stream ${id} after resume:`, err.message);
      }
    }
  });
}
